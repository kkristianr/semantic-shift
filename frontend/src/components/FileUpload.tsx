/**
 * File upload component for CSV papers data
 */
import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useMutation, useQuery } from '@tanstack/react-query';
import apiService from '@/services/api';
import { useSession } from '@/hooks/useSession';
import { Button } from '@/components/ui';
import { Trash2 } from 'lucide-react';

interface UploadResponse {
  message: string;
  papers_created: number;
  papers_skipped: number;
  total_rows: number;
  session_id: string;
}

const FileUpload = () => {
  const { hasActiveSession, isLoading: sessionLoading } = useSession();
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [uploadError, setUploadError] = useState<string>('');
  const [showStats, setShowStats] = useState<boolean>(false);

  // Fetch current statistics only when explicitly requested and session is active
  const { data: stats, isLoading: statsLoading, refetch: fetchStats } = useQuery({
    queryKey: ['uploadStats'],
    queryFn: () => apiService.getUploadStatistics(),
    enabled: false, // Don't fetch automatically
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: (file: File) => apiService.uploadCSV(file),
    onSuccess: (data: UploadResponse) => {
      setUploadStatus(`${data.message}`);
      setUploadError('');
      setShowStats(false); // Hide stats after successful upload
      // Don't automatically fetch statistics
    },
    onError: (error: Error) => {
      setUploadError(`Upload failed: ${error.message}`);
      setUploadStatus('');
    },
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0 && hasActiveSession) {
      const file = acceptedFiles[0];
      setUploadStatus('Uploading file...');
      setUploadError('');
      setShowStats(false); // Hide stats when starting new upload
      uploadMutation.mutate(file);
    } else if (!hasActiveSession) {
      setUploadError('Please start a session before uploading data.');
    }
  }, [uploadMutation, hasActiveSession]);

  const handleShowStats = () => {
    if (hasActiveSession) {
      setShowStats(true);
      fetchStats(); // Explicitly fetch statistics
    } else {
      setUploadError('Please start a session before viewing statistics.');
    }
  };

  const handleResetData = () => {
    if (!hasActiveSession) {
      setUploadError('Please start a session before resetting data.');
      return;
    }
    
    if (window.confirm('Are you sure you want to reset all data? This action cannot be undone.')) {
      apiService.clearAllPapers().then(() => {
        setUploadStatus('Data reset successfully.');
        setUploadError('');
        setShowStats(false);
        fetchStats(); // Refetch stats after reset
      }).catch((error: Error) => {
        setUploadError(`Failed to reset data: ${error.message}`);
        setUploadStatus('');
      });
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
    },
    multiple: false,
  });

  return (
    <div className="w-full p-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Data upload
        </h2>
        <p>
          You need to carry data processing on your own. You can experiment with various data preprocessing steps, however, we recommend to keep your text as it is. For further information, please refer to the <a href="https://radimrehurek.com/gensim/models/word2vec.html#usage-examples" className="text-blue-600 hover:underline">Input Format for Word2Vec training</a>.
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8 mt-4">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">
          Required data format
        </h3>
        <div className="space-y-3 text-blue-800">
          <p>
          Your data should be divided into "indexes". An "index" is referred to a unique slice of time or space. 
          For example, if you dealing with a corpus of papers, an index could be a specific year or range of years. In synchronic data, the index could be a specific publisher or a specific journal. 
          </p>
          <p>
            <strong>File format:</strong> CSV
          </p>
          <p>
            <strong>Required column labels (case-sensitive):</strong>
          </p>
          <ul className="list-disc list-inside ml-4 space-y-1">
          <li>
              <code className="bg-blue-100 px-2 py-1 rounded">text</code> - Concatenated text 
              content for this index
            </li>
            <li>
              <code className="bg-blue-100 px-2 py-1 rounded">index</code> - Unique identifier 
              (year, decade, publisher ID, etc.)
            </li>

          </ul>
          <p>
            <strong>Important:</strong> Each index must be unique. Duplicate indexes will be skipped.
          </p>
        </div>
      </div>

      <div className="mb-8">
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            hasActiveSession
              ? `cursor-pointer ${
                  isDragActive
                    ? 'border-blue-400 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                }`
              : 'cursor-not-allowed border-gray-200 bg-gray-50 opacity-60'
          }`}
        >
          <input {...getInputProps()} disabled={!hasActiveSession} />
          <div className="space-y-4">
            <div className="text-6xl">📁</div>
            {!hasActiveSession ? (
              <div>
                <p className="text-lg text-gray-500 mb-2">
                  Start a session to upload data
                </p>
                <p className="text-sm text-gray-400">
                  File upload is disabled without an active session
                </p>
              </div>
            ) : isDragActive ? (
              <p className="text-lg text-blue-600">Drop the CSV file here...</p>
            ) : (
              <div>
                <p className="text-lg text-gray-600 mb-2">
                  Drag and drop a CSV file here, or click to select
                </p>
                <p className="text-sm text-gray-500">
                  Only CSV files are supported
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {uploadStatus && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800">{uploadStatus}</p>
        </div>
      )}

      {uploadError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{uploadError}</p>
        </div>
      )}

      {uploadMutation.isPending && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <p className="text-blue-800">Processing upload...</p>
          </div>
        </div>
      )}

      <div className="mb-6 text-center space-y-3">
        <div className="flex justify-center gap-3">
          <Button
            onClick={handleShowStats}
            variant="primary"
            size="md"
            disabled={!hasActiveSession || sessionLoading}
          >
            Show data statistics
          </Button>
          
          <Button
            onClick={handleResetData}
            variant="danger"
            size="md"
            leftIcon={<Trash2 className="w-4 h-4" />}
            disabled={!hasActiveSession || sessionLoading}
          >
            Reset data
          </Button>
        </div>
      </div>

      {showStats && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Data statistics</h3>
          
          {statsLoading ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading statistics...</p>
            </div>
          ) : stats ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{stats.total_indexes}</div>
                  <div className="text-sm text-blue-800"># of indexes</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{stats.unique_indexes}</div>
                  <div className="text-sm text-green-800">unique # of indexes</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{stats.total_tokens.toLocaleString()}</div>
                  <div className="text-sm text-purple-800"># of tokens</div>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">{stats.total_characters.toLocaleString()}</div>
                  <div className="text-sm text-orange-800"># of characters</div>
                </div>
              </div>
              
              {/* Unique Indexes List */}
              {stats.unique_index_list && stats.unique_index_list.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-md font-medium text-gray-900 mb-3">Unique indexes</h4>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex flex-wrap gap-2">
                      {stats.unique_index_list.map((index, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full"
                        >
                          {index}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500">
              No statistics available
            </div>
          )}
        </div>
      )}

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">
          Example data structure
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-4 py-2 text-left font-semibold">index</th>
                <th className="border border-gray-300 px-4 py-2 text-left font-semibold">text</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-gray-300 px-4 py-2">1990</td>
                <td className="border border-gray-300 px-4 py-2">
                  Healthcare systems in the 1990s focused on cost containment...
                </td>
              </tr>
              <tr>
                <td className="border border-gray-300 px-4 py-2">2000</td>
                <td className="border border-gray-300 px-4 py-2">
                  The new millennium brought digital transformation to healthcare...
                </td>
              </tr>
              <tr>
                <td className="border border-gray-300 px-4 py-2">2010</td>
                <td className="border border-gray-300 px-4 py-2">
                  Electronic health records became standard practice...
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default FileUpload;

