import React, { useState, useCallback, useEffect, useMemo } from 'react';
import type { FormData } from './types';
import { generateRPM, generateLKPD, generateLearningDetailsAndSubjectMatter, generateMeetingMaterials, generateMeetingDimensions, generatePPT } from './services/geminiService';
import LoadingSpinner from './components/LoadingSpinner';
import { LEARNING_MODELS, GRADUATE_PROFILE_DIMENSIONS, EDUCATION_LEVELS, SUBJECTS_BY_LEVEL_AND_PHASE } from './types';
import { LEARNING_OUTCOMES } from './data/learningOutcomes';

declare const html2canvas: any;
declare const jspdf: any;
declare const JSZip: any;
declare const PptxGenJS: any;

interface GenerationResult {
  mainRpm: string;
  lkpds: string[];
  pptContent: any[];
}

const App: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    schoolName: '',
    teacherName: '',
    teacherNip: '',
    principalName: '',
    principalNip: '',
    location: '',
    date: new Date().toISOString().split('T')[0],
    educationLevel: '',
    grade: '',
    phase: '',
    semester: '',
    subject: '',
    learningOutcomes: '',
    learningObjectives: '',
    subjectMatter: '',
    meetings: 1,
    duration: '2 x 45 menit',
    learningModels: Array(1).fill(LEARNING_MODELS[0]),
    meetingMaterials: Array(1).fill(''),
    meetingGraduateProfileDimensions: Array(1).fill([]),
  });
  
  const [generationResult, setGenerationResult] = useState<GenerationResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [validationErrors, setValidationErrors] = useState<Partial<Record<keyof FormData | 'meetingGraduateProfileDimensions', string>>>({});
  const [isGeneratingObjectives, setIsGeneratingObjectives] = useState<boolean>(false);
  const [isGeneratingSubjectMatter, setIsGeneratingSubjectMatter] = useState<boolean>(false);
  const [isGeneratingMeetingMaterials, setIsGeneratingMeetingMaterials] = useState<boolean>(false);
  const [isGeneratingMeetingDimensions, setIsGeneratingMeetingDimensions] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<number>(0); // 0 for main RPM, 1+ for LKPDs, -1 for PPT


  const getPhase = (level: FormData['educationLevel'], grade: string): string => {
    if (!level || !grade) return '';
    if (level === 'SD') {
      if (['1', '2'].includes(grade)) return 'A';
      if (['3', '4'].includes(grade)) return 'B';
      if (['5', '6'].includes(grade)) return 'C';
    }
    if (level === 'SMP') return 'D'; // Grade 7, 8, 9
    if (level === 'SMA' || level === 'SMK') {
       if (grade === '10') return 'E';
       if (['11', '12'].includes(grade)) return 'F';
    }
    return '';
  };

  useEffect(() => {
    const newPhase = getPhase(formData.educationLevel, formData.grade);
    setFormData(prev => ({...prev, phase: newPhase}));
  }, [formData.educationLevel, formData.grade]);

  // Effect 1: Auto-fetch CP when dropdowns change.
  useEffect(() => {
    const { educationLevel, grade, subject } = formData;
    if (educationLevel && grade && subject) {
      const currentPhase = getPhase(educationLevel, grade);
      let subjectForCP = subject;

      if (currentPhase === 'E') {
        const scienceAndSocialSubjects = [
          'Biologi', 'Fisika', 'Kimia', 'Ilmu Pengetahuan Alam (IPA)',
          'Ekonomi', 'Geografi', 'Sosiologi', 'Antropologi', 'Ilmu Pengetahuan Sosial (IPS)',
          'Ilmu Pengetahuan Alam dan Sosial (IPAS)'
        ];

        if (scienceAndSocialSubjects.includes(subject)) {
          if (educationLevel === 'SMK') {
            subjectForCP = 'Ilmu Pengetahuan Alam dan Sosial (IPAS)';
          } else if (educationLevel === 'SMA') {
            const ipaSubjects = ['Biologi', 'Fisika', 'Kimia', 'Ilmu Pengetahuan Alam (IPA)'];
            if (ipaSubjects.includes(subject)) {
              subjectForCP = 'Ilmu Pengetahuan Alam (IPA)';
            } else {
              subjectForCP = 'Ilmu Pengetahuan Sosial (IPS)';
            }
          }
        }
      }

      const cp = LEARNING_OUTCOMES[educationLevel]?.[currentPhase]?.[subjectForCP] || 'Capaian Pembelajaran tidak ditemukan untuk spesifikasi ini.';
      // When CP changes, clear the old derived data (objectives, subject matter, meeting materials)
      setFormData(prev => ({...prev, learningOutcomes: cp, learningObjectives: '', subjectMatter: '', meetingMaterials: Array(prev.meetings).fill(''), meetingGraduateProfileDimensions: Array(prev.meetings).fill([]) }));

    } else {
      setFormData(prev => ({...prev, learningOutcomes: ''}));
    }
  }, [formData.educationLevel, formData.grade, formData.subject]);

  const handleGenerateDetails = useCallback(async () => {
    const { learningOutcomes, subject, grade } = formData;
    if (learningOutcomes && !learningOutcomes.includes('tidak ditemukan') && subject && grade) {
      setIsGeneratingObjectives(true);
      setIsGeneratingSubjectMatter(true);
      setError(''); // Clear previous errors
      
      // Clear previous results before generating new ones
      setFormData(prev => ({ ...prev, learningObjectives: '', subjectMatter: '' }));

      try {
        const { objectives, subjectMatter } = await generateLearningDetailsAndSubjectMatter(learningOutcomes, subject, grade);
        setFormData(prev => ({
          ...prev,
          learningObjectives: objectives,
          subjectMatter: subjectMatter,
        }));
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Terjadi kesalahan');
        setFormData(prev => ({
          ...prev,
          learningObjectives: 'Gagal membuat tujuan pembelajaran otomatis. Silakan isi manual atau coba lagi.',
          subjectMatter: 'Gagal membuat materi pelajaran otomatis. Silakan isi manual atau coba lagi.',
        }));
      } finally {
        setIsGeneratingObjectives(false);
        setIsGeneratingSubjectMatter(false);
      }
    }
  }, [formData.learningOutcomes, formData.subject, formData.grade]);

  // Effect 2: Debounced automatic generation of Learning Details
  useEffect(() => {
    const { learningOutcomes, subject, grade } = formData;
    const isValidForGeneration = learningOutcomes && !learningOutcomes.includes('tidak ditemukan') && subject && grade;

    if (isValidForGeneration) {
        const handler = setTimeout(() => {
            handleGenerateDetails();
        }, 1000); // Wait for 1 second of inactivity before making the API call

        return () => {
            clearTimeout(handler);
        };
    }
  }, [formData.learningOutcomes, formData.subject, formData.grade, handleGenerateDetails]);

  const handleGenerateMeetingMaterials = useCallback(async () => {
    const { subjectMatter, subject, grade, meetings } = formData;
    if (subjectMatter && !subjectMatter.includes('Gagal') && subject && grade && meetings > 0) {
        setIsGeneratingMeetingMaterials(true);
        setError('');
        try {
            const materials = await generateMeetingMaterials(subjectMatter, subject, grade, meetings);
            setFormData(prev => ({
                ...prev,
                meetingMaterials: materials,
            }));
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Gagal memecah materi pelajaran.');
            setFormData(prev => ({
                ...prev,
                meetingMaterials: Array(meetings).fill('Gagal membuat materi. Silakan isi manual.'),
            }));
        } finally {
            setIsGeneratingMeetingMaterials(false);
        }
    }
  }, [formData.subjectMatter, formData.subject, formData.grade, formData.meetings]);

  // Effect 3: Debounced automatic generation of Meeting Materials
  useEffect(() => {
    const { subjectMatter, subject, grade, meetings } = formData;
    const canGenerate = subjectMatter && !subjectMatter.includes('Gagal') && subject && grade && meetings > 0;
    
    if (canGenerate) {
        const handler = setTimeout(() => {
            handleGenerateMeetingMaterials();
        }, 1500);

        return () => clearTimeout(handler);
    }
  }, [formData.subjectMatter, formData.subject, formData.grade, formData.meetings, handleGenerateMeetingMaterials]);
  
  const handleGenerateMeetingDimensions = useCallback(async () => {
      const { meetings, meetingMaterials, subject, grade, learningModels } = formData;
      if (meetingMaterials.some(m => !m || m.includes('Gagal'))) {
        return;
      }

      setIsGeneratingMeetingDimensions(true);
      setError('');
      try {
        const dimensionPromises = Array.from({ length: meetings }).map((_, i) =>
          generateMeetingDimensions(
            meetingMaterials[i],
            learningModels[i],
            GRADUATE_PROFILE_DIMENSIONS,
            subject,
            grade
          )
        );
        const results = await Promise.all(dimensionPromises);
        setFormData(prev => ({
          ...prev,
          meetingGraduateProfileDimensions: results,
        }));
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Gagal membuat rekomendasi dimensi.');
        setFormData(prev => ({
            ...prev,
            meetingGraduateProfileDimensions: Array(meetings).fill([]),
        }));
      } finally {
        setIsGeneratingMeetingDimensions(false);
      }
  }, [formData.meetings, formData.meetingMaterials, formData.subject, formData.grade, formData.learningModels]);

  // Effect 4: Auto-generate meeting dimensions after materials are set
  useEffect(() => {
      const { meetingMaterials } = formData;
      const canGenerate = meetingMaterials.length > 0 &&
                          !meetingMaterials.some(m => !m || m.includes('Gagal'));

      if (canGenerate) {
          const handler = setTimeout(() => {
              handleGenerateMeetingDimensions();
          }, 1000);

          return () => clearTimeout(handler);
      }
  }, [formData.meetingMaterials, handleGenerateMeetingDimensions]);


  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }, []);

  const availableSubjects = useMemo(() => {
    const { educationLevel, phase } = formData;
    if (educationLevel && phase) {
      return SUBJECTS_BY_LEVEL_AND_PHASE[educationLevel]?.[phase] || [];
    }
    return [];
  }, [formData.educationLevel, formData.phase]);
  
  // Effect 5: Reset subject if it's not in the new availableSubjects list (e.g., when grade/phase changes)
  useEffect(() => {
    if (formData.subject && !availableSubjects.includes(formData.subject)) {
      setFormData(prev => ({ ...prev, subject: '' }));
    }
  }, [availableSubjects, formData.subject]);


  const handleMeetingsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const count = Math.max(1, parseInt(e.target.value, 10) || 1);
    setFormData(prev => ({
      ...prev,
      meetings: count,
      learningModels: Array(count).fill(prev.learningModels[0] || LEARNING_MODELS[0])
        .map((model, i) => prev.learningModels[i] || model),
      meetingMaterials: Array(count).fill('')
        .map((mat, i) => prev.meetingMaterials?.[i] || mat),
      meetingGraduateProfileDimensions: Array(count).fill([])
        .map((dim, i) => prev.meetingGraduateProfileDimensions?.[i] || dim),
    }));
  };
  
  const handleLearningModelChange = (index: number, value: string) => {
    setFormData(prev => {
      const newModels = [...prev.learningModels];
      newModels[index] = value;
      return { ...prev, learningModels: newModels };
    });
  };
  
  const handleMeetingMaterialChange = (index: number, value: string) => {
    setFormData(prev => {
      const newMaterials = [...prev.meetingMaterials];
      newMaterials[index] = value;
      return { ...prev, meetingMaterials: newMaterials };
    });
  };

  const handleMeetingGraduateProfileDimensionChange = (meetingIndex: number, dimension: string) => {
    setFormData(prev => {
      const newMeetingDimensions = [...prev.meetingGraduateProfileDimensions];
      const currentMeetingDims = newMeetingDimensions[meetingIndex] || [];
      
      const updatedDims = currentMeetingDims.includes(dimension)
        ? currentMeetingDims.filter(d => d !== dimension)
        : [...currentMeetingDims, dimension];

      newMeetingDimensions[meetingIndex] = updatedDims;

      return { ...prev, meetingGraduateProfileDimensions: newMeetingDimensions };
    });
  };

  const handleEducationLevelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const level = e.target.value as FormData['educationLevel'];
    setFormData(prev => ({
      ...prev,
      educationLevel: level,
      grade: level ? EDUCATION_LEVELS[level][0] : '',
      subject: '' // Reset subject when level changes
    }));
  };

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof FormData | 'meetingGraduateProfileDimensions', string>> = {};
    if (!formData.schoolName.trim()) errors.schoolName = "Nama Satuan Pendidikan wajib diisi.";
    if (!formData.teacherName.trim()) errors.teacherName = "Nama Guru wajib diisi.";
    if (!formData.principalName.trim()) errors.principalName = "Nama Kepala Sekolah wajib diisi.";
    if (!formData.location.trim()) errors.location = "Tempat wajib diisi.";
    if (!formData.date) errors.date = "Tanggal wajib diisi.";
    if (!formData.educationLevel) errors.educationLevel = "Jenjang Pendidikan wajib dipilih.";
    if (!formData.grade) errors.grade = "Kelas wajib dipilih.";
    if (!formData.semester) errors.semester = "Semester wajib dipilih.";
    if (!formData.subject) errors.subject = "Mata Pelajaran wajib dipilih.";
    if (!formData.learningOutcomes.trim() || formData.learningOutcomes.includes('tidak ditemukan')) errors.learningOutcomes = "Capaian Pembelajaran tidak dapat ditemukan atau belum terisi.";
    if (!formData.learningObjectives.trim()) errors.learningObjectives = "Tujuan Pembelajaran wajib diisi.";
    if (!formData.subjectMatter.trim()) errors.subjectMatter = "Materi Pelajaran wajib diisi.";
    if (formData.meetingMaterials.some(m => !m.trim())) errors.meetingMaterials = "Materi pelajaran untuk setiap pertemuan wajib diisi.";
    if (formData.meetingGraduateProfileDimensions.some(d => d.length === 0)) errors.meetingGraduateProfileDimensions = "Setiap pertemuan harus memiliki minimal satu Dimensi Profil Lulusan.";

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }
    setIsLoading(true);
    setError('');
    setGenerationResult(null);
    try {
      const rpmPromise = generateRPM(formData);
      const lkpdPromises = Array.from({ length: formData.meetings }).map((_, i) =>
        generateLKPD(formData, i)
      );
      const pptPromise = generatePPT(formData);
      
      const [mainRpmResult, ...remainingResults] = await Promise.all([rpmPromise, ...lkpdPromises, pptPromise]);
      
      const lkpdResults = remainingResults.slice(0, formData.meetings) as string[];
      const pptResult = remainingResults[remainingResults.length - 1] as any[];

      setGenerationResult({
        mainRpm: mainRpmResult,
        lkpds: lkpdResults,
        pptContent: pptResult
      });
      setActiveTab(0);

    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan');
    } finally {
      setIsLoading(false);
    }
  };

  const downloadAsWord = () => {
    const rpmContainer = document.getElementById('rpm-output-content');
    if (rpmContainer && generationResult) {
      const htmlContent = rpmContainer.innerHTML;
      const source = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
          <head>
            <meta charset='utf-8'>
            <title>Rencana Pembelajaran Mendalam</title>
            <style>
              table { width: 100%; border-collapse: collapse; table-layout: fixed; }
              th, td { border: 1px solid black; padding: 8px; vertical-align: top; overflow-wrap: break-word; word-wrap: break-word; }
              td { text-align: justify; }
              th[colspan] { background-color: #f2f2f2; text-align: left; }
              table.signature-table, table.signature-table td { border: none; }
            </style>
          </head>
          <body>
            ${htmlContent}
          </body>
        </html>
      `;
      const docName = activeTab === 0 
        ? `RPM - ${formData.subject || 'Mata Pelajaran'}`
        : `LKPD Pertemuan ${activeTab} - ${formData.subject || 'Mata Pelajaran'}`;

      const blob = new Blob([source], { type: 'application/msword' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${docName}.doc`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const downloadAllLkpdAsZip = async () => {
    if (!generationResult || !generationResult.lkpds.length) return;

    try {
      if (typeof JSZip === 'undefined') {
        throw new Error('Library ZIP belum siap. Mohon tunggu sejenak atau muat ulang halaman.');
      }

      const zip = new JSZip();
      const safeSubject = formData.subject.replace(/[^a-zA-Z0-9]/g, '_');

      // 1. Tambahkan RPM Utama
      const rpmSource = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
          <head>
            <meta charset='utf-8'>
            <title>RPM Utama</title>
            <style>
              table { width: 100%; border-collapse: collapse; table-layout: fixed; }
              th, td { border: 1px solid black; padding: 8px; vertical-align: top; overflow-wrap: break-word; word-wrap: break-word; }
              td { text-align: justify; }
              th[colspan] { background-color: #f2f2f2; text-align: left; }
              table.signature-table, table.signature-table td { border: none; }
            </style>
          </head>
          <body>
            ${generationResult.mainRpm}
          </body>
        </html>
      `;
      zip.file(`RPM_Utama_${safeSubject}.doc`, rpmSource);

      // 2. Tambahkan Semua LKPD
      generationResult.lkpds.forEach((lkpdContent, index) => {
        const source = `
          <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
            <head>
              <meta charset='utf-8'>
              <title>LKPD Pertemuan ${index + 1}</title>
              <style>
                table { width: 100%; border-collapse: collapse; table-layout: fixed; }
                th, td { border: 1px solid black; padding: 8px; vertical-align: top; overflow-wrap: break-word; word-wrap: break-word; }
                td { text-align: justify; }
              </style>
            </head>
            <body>
              ${lkpdContent}
            </body>
          </html>
        `;
        zip.file(`LKPD_Pertemuan_${index + 1}.doc`, source);
      });

      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Perangkat_Ajar_${safeSubject}_Kelas_${formData.grade}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

    } catch (error: any) {
      console.error("Error creating zip:", error);
      setError(error.message || "Gagal membuat file ZIP.");
    }
  };

  const downloadAsPptx = () => {
    if (!generationResult || !generationResult.pptContent) return;

    try {
      if (typeof PptxGenJS === 'undefined') {
          throw new Error('Library PowerPoint belum siap. Mohon tunggu sejenak.');
      }

      const pptx = new PptxGenJS();
      pptx.layout = 'LAYOUT_16x9';

      generationResult.pptContent.forEach((slideData: any, idx: number) => {
        let slide = pptx.addSlide();
        
        // Background color
        slide.background = { fill: idx === 0 ? "2B6CB0" : "FFFFFF" };

        // Title
        slide.addText(slideData.title, {
          x: 0.5, y: 0.5, w: 9, h: 1,
          fontSize: 32,
          bold: true,
          color: idx === 0 ? "FFFFFF" : "2B6CB0",
          align: idx === 0 ? "center" : "left"
        });

        // Content
        if (slideData.content && slideData.content.length > 0) {
            slide.addText(
              slideData.content.map((point: string) => ({ text: point, options: { bullet: true, margin: 5 } })),
              {
                x: 0.5, y: 1.5, w: 9, h: 4,
                fontSize: 20,
                color: idx === 0 ? "FFFFFF" : "333333",
                align: "left",
                valign: "top"
              }
            );
        }
      });

      pptx.writeFile({ fileName: `Bahan_Tayang_${formData.subject}_${formData.grade}.pptx` });

    } catch (err: any) {
      console.error("Error creating PPTX:", err);
      setError(err.message || "Gagal membuat file PowerPoint.");
    }
  };
  
  const downloadAsPdf = async () => {
    const rpmContainer = document.getElementById('rpm-output-content');
    if (rpmContainer && typeof html2canvas !== 'undefined' && typeof jspdf !== 'undefined' && generationResult) {
      try {
        const canvas = await html2canvas(rpmContainer, {
          scale: 2,
          useCORS: true,
        });
  
        const imgData = canvas.toDataURL('image/png');
        const { jsPDF } = jspdf;
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4',
        });
  
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        const ratio = canvasWidth / pdfWidth;
        const imgHeight = canvasHeight / ratio;
        const pdfHeight = pdf.internal.pageSize.getHeight();
  
        let heightLeft = imgHeight;
        let position = 0;
  
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
        heightLeft -= pdfHeight;
  
        while (heightLeft > 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
          heightLeft -= pdfHeight;
        }
        
        const docName = activeTab === 0 
          ? `RPM - ${formData.subject || 'Mata Pelajaran'}`
          : `LKPD Pertemuan ${activeTab} - ${formData.subject || 'Mata Pelajaran'}`;
  
        pdf.save(`${docName}.pdf`);
      } catch (error) {
        console.error("Error generating PDF:", error);
        setError("Gagal membuat file PDF. Silakan coba lagi.");
      }
    } else {
        setError("Fungsi unduh PDF tidak dapat dimuat. Coba muat ulang halaman.");
    }
  };


  const renderInputField = (id: keyof FormData, label: string, type: string = 'text', required: boolean = true) => (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700">{label}</label>
      <input
        type={type}
        id={id}
        name={id}
        value={formData[id as keyof Omit<FormData, 'meetings' | 'learningModels' | 'location' | 'date' | 'meetingMaterials' | 'meetingGraduateProfileDimensions' >]}
        onChange={handleInputChange}
        required={required}
        className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
      />
      {validationErrors[id] && <p className="text-red-500 text-xs mt-1">{validationErrors[id]}</p>}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
      <header className="bg-white shadow-md">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-3xl font-bold text-blue-700">Generator RPM</h1>
          <p className="text-md text-gray-600">Rencana Pembelajaran Mendalam untuk Semua Jenjang & Mata Pelajaran</p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-lg space-y-6">
              <h2 className="text-xl font-semibold border-b pb-2">Informasi Umum</h2>
              {renderInputField('schoolName', 'Nama Satuan Pendidikan')}
              {renderInputField('teacherName', 'Nama Guru')}
              {renderInputField('teacherNip', 'NIP Guru', 'text', false)}
              {renderInputField('principalName', 'Nama Kepala Sekolah')}
              {renderInputField('principalNip', 'NIP Kepala Sekolah', 'text', false)}
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="location" className="block text-sm font-medium text-gray-700">Tempat</label>
                  <input
                    type="text"
                    id="location"
                    name="location"
                    value={formData.location}
                    onChange={handleInputChange}
                    required
                    className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                  {validationErrors.location && <p className="text-red-500 text-xs mt-1">{validationErrors.location}</p>}
                </div>
                <div>
                  <label htmlFor="date" className="block text-sm font-medium text-gray-700">Tanggal</label>
                  <input
                    type="date"
                    id="date"
                    name="date"
                    value={formData.date}
                    onChange={handleInputChange}
                    required
                    className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                  {validationErrors.date && <p className="text-red-500 text-xs mt-1">{validationErrors.date}</p>}
                </div>
              </div>


              <h2 className="text-xl font-semibold border-b pb-2 pt-4">Detail Pembelajaran</h2>
              <div>
                <label htmlFor="educationLevel" className="block text-sm font-medium text-gray-700">Jenjang Pendidikan</label>
                <select id="educationLevel" name="educationLevel" value={formData.educationLevel} onChange={handleEducationLevelChange} required className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md">
                  <option value="">Pilih Jenjang</option>
                  {Object.keys(EDUCATION_LEVELS).map(level => <option key={level} value={level}>{level}</option>)}
                </select>
                 {validationErrors.educationLevel && <p className="text-red-500 text-xs mt-1">{validationErrors.educationLevel}</p>}
              </div>

              <div className={`grid ${formData.educationLevel ? 'grid-cols-3' : 'grid-cols-2'} gap-4`}>
                {formData.educationLevel && (
                   <>
                    <div>
                      <label htmlFor="grade" className="block text-sm font-medium text-gray-700">Kelas</label>
                      <select id="grade" name="grade" value={formData.grade} onChange={handleInputChange} required className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md">
                      {EDUCATION_LEVELS[formData.educationLevel as keyof typeof EDUCATION_LEVELS].map(grade => <option key={grade} value={grade}>{grade}</option>)}
                      </select>
                       {validationErrors.grade && <p className="text-red-500 text-xs mt-1">{validationErrors.grade}</p>}
                    </div>
                     <div>
                      <label htmlFor="phase" className="block text-sm font-medium text-gray-700">Fase</label>
                      <input
                        type="text"
                        id="phase"
                        name="phase"
                        value={formData.phase}
                        readOnly
                        className="mt-1 block w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm cursor-not-allowed"
                        placeholder="Otomatis"
                      />
                    </div>
                  </>
                )}
                <div>
                  <label htmlFor="semester" className="block text-sm font-medium text-gray-700">Semester</label>
                  <select id="semester" name="semester" value={formData.semester} onChange={handleInputChange} required className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md">
                    <option value="">Pilih Semester</option>
                    <option value="Ganjil">Ganjil</option>
                    <option value="Genap">Genap</option>
                  </select>
                  {validationErrors.semester && <p className="text-red-500 text-xs mt-1">{validationErrors.semester}</p>}
                </div>
              </div>

              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-gray-700">Mata Pelajaran</label>
                <select
                  id="subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleInputChange}
                  required
                  disabled={!formData.educationLevel || !formData.phase}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="">{formData.educationLevel ? 'Pilih Mata Pelajaran' : 'Pilih Jenjang & Kelas'}</option>
                  {availableSubjects.map(subject => (
                    <option key={subject} value={subject}>{subject}</option>
                  ))}
                </select>
                {validationErrors.subject && <p className="text-red-500 text-xs mt-1">{validationErrors.subject}</p>}
              </div>
              
               <div>
                <label htmlFor="learningOutcomes" className="block text-sm font-medium text-gray-700">Capaian Pembelajaran (CP)</label>
                <div
                  id="learningOutcomesDisplay"
                  className="mt-1 block w-full p-3 bg-gray-100 border border-gray-300 rounded-md shadow-sm min-h-[10rem] max-h-[20rem] text-sm text-gray-800 text-justify overflow-y-auto"
                >
                  {formData.learningOutcomes ? (
                      <div dangerouslySetInnerHTML={{ __html: formData.learningOutcomes }} />
                  ) : (
                      <p className="text-gray-500">
                          Akan terisi otomatis setelah memilih Jenjang, Kelas, dan Mata Pelajaran.
                      </p>
                  )}
                </div>
                {validationErrors.learningOutcomes && <p className="text-red-500 text-xs mt-1">{validationErrors.learningOutcomes}</p>}
              </div>

               <div>
                <label htmlFor="learningObjectives" className="block text-sm font-medium text-gray-700">Tujuan Pembelajaran</label>
                <textarea
                  id="learningObjectives"
                  name="learningObjectives"
                  value={formData.learningObjectives}
                  onChange={handleInputChange}
                  required
                  rows={4}
                  className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder={isGeneratingObjectives 
                    ? "Membuat tujuan pembelajaran otomatis..." 
                    : "Akan terisi otomatis setelah CP termuat, atau isi manual."}
                ></textarea>
                {validationErrors.learningObjectives && <p className="text-red-500 text-xs mt-1">{validationErrors.learningObjectives}</p>}
              </div>

               <div>
                <label htmlFor="subjectMatter" className="block text-sm font-medium text-gray-700">Materi Pelajaran (Utama)</label>
                <textarea
                    id="subjectMatter"
                    name="subjectMatter"
                    value={formData.subjectMatter}
                    onChange={handleInputChange}
                    required
                    rows={3}
                    className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder={isGeneratingSubjectMatter 
                      ? "Menganalisis CP untuk membuat materi pelajaran..." 
                      : "Akan terisi otomatis, atau isi manual."}
                ></textarea>
                 {validationErrors.subjectMatter && <p className="text-red-500 text-xs mt-1">{validationErrors.subjectMatter}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="meetings" className="block text-sm font-medium text-gray-700">Jumlah Pertemuan</label>
                  <input type="number" id="meetings" name="meetings" value={formData.meetings} onChange={handleMeetingsChange} min="1" required className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                </div>
                <div>
                  <label htmlFor="duration" className="block text-sm font-medium text-gray-700">Durasi per Pertemuan</label>
                  <input
                    type="text"
                    id="duration"
                    name="duration"
                    value={formData.duration}
                    onChange={handleInputChange}
                    required
                    className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                  {validationErrors.duration && <p className="text-red-500 text-xs mt-1">{validationErrors.duration}</p>}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Rancangan per Pertemuan</label>
                {validationErrors.meetingGraduateProfileDimensions && <p className="text-red-500 text-xs mt-1">{validationErrors.meetingGraduateProfileDimensions}</p>}
                {validationErrors.meetingMaterials && <p className="text-red-500 text-xs mt-1">{validationErrors.meetingMaterials}</p>}
                <div className="space-y-3 mt-2">
                  {Array.from({ length: formData.meetings }).map((_, i) => (
                    <div key={i} className="p-3 border rounded-md bg-gray-50/50">
                      <p className="font-semibold text-gray-800">Pertemuan {i + 1}</p>
                      <div className="mt-2">
                        <label htmlFor={`learningModel-${i}`} className="text-xs text-gray-600">Model Pembelajaran</label>
                        <select id={`learningModel-${i}`} value={formData.learningModels[i]} onChange={e => handleLearningModelChange(i, e.target.value)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md">
                          {LEARNING_MODELS.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                      </div>
                      <div className="mt-2">
                        <label htmlFor={`meetingMaterial-${i}`} className="text-xs text-gray-600">Materi Pelajaran Pertemuan</label>
                        <textarea
                          id={`meetingMaterial-${i}`}
                          name={`meetingMaterial-${i}`}
                          value={formData.meetingMaterials[i] || ''}
                          onChange={e => handleMeetingMaterialChange(i, e.target.value)}
                          required
                          rows={2}
                          className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          placeholder={isGeneratingMeetingMaterials 
                            ? "Memecah materi pelajaran..." 
                            : "Akan terisi otomatis..."}
                        />
                      </div>
                       <div className="mt-3">
                          <label className="text-xs text-gray-600">
                            Dimensi Profil Lulusan
                            {isGeneratingMeetingDimensions && <span className="italic text-gray-500"> (membuat rekomendasi...)</span>}
                          </label>
                          <div className="mt-1 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                            {GRADUATE_PROFILE_DIMENSIONS.map(dim => (
                                <div key={`${i}-${dim}`} className="flex items-center">
                                    <input
                                        id={`dim-${i}-${dim}`}
                                        type="checkbox"
                                        checked={formData.meetingGraduateProfileDimensions[i]?.includes(dim) || false}
                                        onChange={() => handleMeetingGraduateProfileDimensionChange(i, dim)}
                                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                    />
                                    <label 
                                        htmlFor={`dim-${i}-${dim}`} 
                                        className="ml-2 block text-sm text-gray-900"
                                    >
                                        {dim}
                                    </label>
                                </div>
                            ))}
                          </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button type="submit" disabled={isLoading} className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300">
                {isLoading ? 'Memproses...' : 'Buat RPM, LKPD & PPT'}
              </button>
            </form>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-white p-6 rounded-lg shadow-lg min-h-full">
              <div className="flex justify-between items-center border-b pb-2 mb-4">
                <h2 className="text-xl font-semibold">Hasil Perangkat Ajar</h2>
                {generationResult && (
                  <div className="flex space-x-2">
                    <button onClick={downloadAsPdf} className="px-3 py-2 bg-red-600 text-white font-semibold rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 text-xs sm:text-sm">
                      Unduh PDF
                    </button>
                    <button onClick={downloadAsWord} className="px-3 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 text-xs sm:text-sm">
                      Unduh Word
                    </button>
                    {activeTab === -1 && (
                      <button onClick={downloadAsPptx} className="px-3 py-2 bg-orange-600 text-white font-semibold rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 text-xs sm:text-sm">
                        Unduh PPTX
                      </button>
                    )}
                    <button onClick={downloadAllLkpdAsZip} className="px-3 py-2 bg-green-600 text-white font-semibold rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 text-xs sm:text-sm">
                      Unduh Paket Lengkap (ZIP)
                    </button>
                  </div>
                )}
              </div>
              {isLoading && <LoadingSpinner />}
              {error && <div className="text-red-500 bg-red-100 p-4 rounded-md">{error}</div>}
              
              {generationResult && (
                <div>
                  <div className="border-b border-gray-200">
                    <nav className="-mb-px flex space-x-4 overflow-x-auto" aria-label="Tabs">
                       <button
                        onClick={() => setActiveTab(0)}
                        className={`whitespace-nowrap py-2 px-3 text-sm font-medium border-b-2 ${activeTab === 0 ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                      >
                        RPM Utama
                      </button>
                      {generationResult.lkpds.map((_, index) => (
                        <button
                          key={index + 1}
                          onClick={() => setActiveTab(index + 1)}
                          className={`whitespace-nowrap py-2 px-3 text-sm font-medium border-b-2 ${activeTab === index + 1 ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                        >
                          LKPD {index + 1}
                        </button>
                      ))}
                      <button
                        onClick={() => setActiveTab(-1)}
                        className={`whitespace-nowrap py-2 px-3 text-sm font-medium border-b-2 ${activeTab === -1 ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                      >
                        Bahan Tayang (PPT)
                      </button>
                    </nav>
                  </div>
                  <div id="rpm-output" className="prose max-w-none mt-4">
                    {activeTab === -1 ? (
                      <div className="space-y-6">
                        {generationResult.pptContent.map((slide, i) => (
                          <div key={i} className="p-6 border rounded-lg bg-gray-50 shadow-sm">
                            <h3 className="text-lg font-bold text-blue-800 mb-3">{slide.title}</h3>
                            <ul className="list-disc pl-5 space-y-2">
                              {slide.content.map((point: string, j: number) => (
                                <li key={j} className="text-gray-700">{point}</li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div id="rpm-output-content" dangerouslySetInnerHTML={{ __html: activeTab === 0 ? generationResult.mainRpm : generationResult.lkpds[activeTab - 1] }} />
                    )}
                  </div>
                </div>
              )}

              {!isLoading && !generationResult && !error && (
                <div className="text-center text-gray-500 pt-16">
                  <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">Hasil RPM, LKPD & PPT akan ditampilkan di sini.</h3>
                  <p className="mt-1 text-sm text-gray-500">Lengkapi formulir di sebelah kiri dan klik "Buat RPM, LKPD & PPT".</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;