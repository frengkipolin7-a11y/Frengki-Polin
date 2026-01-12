


export interface FormData {
  schoolName: string;
  teacherName: string;
  teacherNip: string;
  principalName: string;
  principalNip: string;
  location: string;
  date: string;
  educationLevel: 'SD' | 'SMP' | 'SMA' | 'SMK' | '';
  grade: string;
  phase: string;
  semester: 'Ganjil' | 'Genap' | '';
  subject: string;
  learningOutcomes: string;
  learningObjectives: string;
  subjectMatter: string;
  meetings: number;
  duration: string;
  learningModels: string[];
  meetingMaterials: string[];
  meetingGraduateProfileDimensions: string[][];
}

export enum LearningModel {
  INQUIRY = 'Inkuiri-Discovery Learning',
  PJBL = 'Project Based Learning (PjBL)',
  PROBLEM_BASED_LEARNING = 'Problem Based Learning',
  GAME_BASED = 'Game Based Learning',
  STATION = 'Station Learning',
  INTEGRATIVE_THINKING = 'Integrative Thinking',
}

export const LEARNING_MODELS: LearningModel[] = [
  LearningModel.INQUIRY,
  LearningModel.PJBL,
  LearningModel.PROBLEM_BASED_LEARNING,
  LearningModel.GAME_BASED,
  LearningModel.STATION,
  LearningModel.INTEGRATIVE_THINKING,
];

export const GRADUATE_PROFILE_DIMENSIONS = [
  'Keimanan dan ketakwaan kepada Tuhan YME',
  'Kewargaan',
  'Penalaran Kritis',
  'Kreativitas',
  'Kolaborasi',
  'Kemandirian',
  'Kesehatan',
  'Komunikasi',
];

export const EDUCATION_LEVELS = {
  'SD': ['1', '2', '3', '4', '5', '6'],
  'SMP': ['7', '8', '9'],
  'SMA': ['10', '11', '12'],
  'SMK': ['10', '11', '12'],
};

// Define subject lists for each level and phase
const sdSubjects = [
  'Bahasa Indonesia', 'Bahasa Inggris', 'Ilmu Pengetahuan Alam dan Sosial (IPAS)', 'Keterampilan Komputer dan Pengelolaan Informasi (KKA)', 'Matematika', 'Muatan Lokal', 'Pendidikan Agama Buddha dan Budi Pekerti', 'Pendidikan Agama Hindu dan Budi Pekerti', 'Pendidikan Agama Islam dan Budi Pekerti', 'Pendidikan Agama Katolik dan Budi Pekerti', 'Pendidikan Agama Khonghucu dan Budi Pekerti', 'Pendidikan Agama Kristen dan Budi Pekerti', 'Pendidikan Jasmani, Olahraga, dan Kesehatan (PJOK)', 'Pendidikan Pancasila', 'Seni Budaya'
].sort();

const smpSubjects = [
  'Bahasa Daerah', 'Bahasa Indonesia', 'Bahasa Inggris', 'Ilmu Pengetahuan Alam (IPA)', 'Ilmu Pengetahuan Sosial (IPS)', 'Informatika', 'Keterampilan Komputer dan Pengelolaan Informasi (KKA)', 'Matematika', 'Pendidikan Agama Buddha dan Budi Pekerti', 'Pendidikan Agama Hindu dan Budi Pekerti', 'Pendidikan Agama Islam dan Budi Pekerti', 'Pendidikan Agama Katolik dan Budi Pekerti', 'Pendidikan Agama Khonghucu dan Budi Pekerti', 'Pendidikan Agama Kristen dan Budi Pekerti', 'Pendidikan Jasmani, Olahraga, dan Kesehatan (PJOK)', 'Pendidikan Pancasila', 'Prakarya', 'Seni Budaya'
].sort();

const smaPhaseESubjects = [
  'Bahasa Indonesia', 'Bahasa Inggris', 'Ekonomi', 'Geografi', 'Ilmu Pengetahuan Alam (IPA)', 'Ilmu Pengetahuan Sosial (IPS)', 'Informatika', 'Keterampilan Komputer dan Pengelolaan Informasi (KKA)', 'Matematika', 'Pendidikan Agama Buddha dan Budi Pekerti', 'Pendidikan Agama Hindu dan Budi Pekerti', 'Pendidikan Agama Islam dan Budi Pekerti', 'Pendidikan Agama Katolik dan Budi Pekerti', 'Pendidikan Agama Khonghucu dan Budi Pekerti', 'Pendidikan Agama Kristen dan Budi Pekerti', 'Pendidikan Jasmani, Olahraga, dan Kesehatan (PJOK)', 'Pendidikan Pancasila', 'Prakarya dan Kewirausahaan', 'Sejarah', 'Seni Budaya', 'Sosiologi'
].sort();

const smaPhaseFSubjects = [
  'Antropologi', 'Bahasa Asing Lainnya', 'Bahasa dan Sastra Indonesia', 'Bahasa dan Sastra Inggris', 'Bahasa Indonesia', 'Bahasa Inggris', 'Biologi', 'Ekonomi', 'Fisika', 'Geografi', 'Kimia', 'Matematika Tingkat Lanjut', 'Pendidikan Agama Buddha dan Budi Pekerti', 'Pendidikan Agama Hindu dan Budi Pekerti', 'Pendidikan Agama Islam dan Budi Pekerti', 'Pendidikan Agama Katolik dan Budi Pekerti', 'Pendidikan Agama Khonghucu dan Budi Pekerti', 'Pendidikan Agama Kristen dan Budi Pekerti', 'Pendidikan Jasmani, Olahraga, dan Kesehatan (PJOK)', 'Pendidikan Pancasila', 'Sejarah', 'Sosiologi'
].sort();

const smkPhaseESubjects = [
  'Bahasa Indonesia', 'Bahasa Inggris', 'Ilmu Pengetahuan Alam dan Sosial (IPAS)', 'Informatika', 'Keterampilan Komputer dan Pengelolaan Informasi (KKA)', 'Matematika', 'Pendidikan Agama Buddha dan Budi Pekerti', 'Pendidikan Agama Hindu dan Budi Pekerti', 'Pendidikan Agama Islam dan Budi Pekerti', 'Pendidikan Agama Katolik dan Budi Pekerti', 'Pendidikan Agama Khonghucu dan Budi Pekerti', 'Pendidikan Agama Kristen dan Budi Pekerti', 'Pendidikan Jasmani, Olahraga, dan Kesehatan (PJOK)', 'Pendidikan Pancasila', 'Prakarya dan Kewirausahaan', 'Sejarah', 'Seni Budaya'
].sort();

const smkPhaseFSubjects = [
  'Bahasa Indonesia', 'Bahasa Inggris', 'Matematika', 'Pendidikan Agama Buddha dan Budi Pekerti', 'Pendidikan Agama Hindu dan Budi Pekerti', 'Pendidikan Agama Islam dan Budi Pekerti', 'Pendidikan Agama Katolik dan Budi Pekerti', 'Pendidikan Agama Khonghucu dan Budi Pekerti', 'Pendidikan Agama Kristen dan Budi Pekerti', 'Pendidikan Pancasila'
].sort();

export const SUBJECTS_BY_LEVEL_AND_PHASE: { [level: string]: { [phase: string]: string[] } } = {
  'SD': {
    'A': sdSubjects,
    'B': sdSubjects,
    'C': sdSubjects,
  },
  'SMP': {
    'D': smpSubjects,
  },
  'SMA': {
    'E': smaPhaseESubjects,
    'F': smaPhaseFSubjects,
  },
  'SMK': {
    'E': smkPhaseESubjects,
    'F': smkPhaseFSubjects,
  },
};
