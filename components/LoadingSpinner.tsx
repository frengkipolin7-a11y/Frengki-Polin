
import React from 'react';

const LoadingSpinner: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center space-y-4">
      <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600"></div>
      <p className="text-lg font-semibold text-gray-700">Membuat Rencana Pembelajaran & Lembar Kerja...</p>
      <p className="text-sm text-gray-500 text-center">Proses ini mungkin memakan waktu lebih lama tergantung jumlah pertemuan. Harap tunggu.</p>
    </div>
  );
};

export default LoadingSpinner;
