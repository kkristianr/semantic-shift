/**
 * Word2Vec training and visualization component
 */
import { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import apiService from '@/services/api';
import { useSession } from '@/hooks/useSession';
import { TrainingSettings } from '@/types/api';
import CosineSimilarityCharts from './CosineSimilarityCharts';
import { Button, Input, Select } from '@/components/ui';

const Word2VecTraining = () => {
  const { hasActiveSession } = useSession();
  const [trainingSettings, setTrainingSettings] = useState<TrainingSettings>({
    vector_dim: 100,
    window: 20,
    min_count: 2,
    epochs: 20,
    alignment_method: "procrustes"
  });
  const [selectedWord, setSelectedWord] = useState<string>('');
  const [topN, setTopN] = useState<number>(20);
  const [activeTab, setActiveTab] = useState<'training' | 'neighbors' | 'similarities'>('training');
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [statusPollingInterval, setStatusPollingInterval] = useState<NodeJS.Timeout | null>(null);

  const { data: neighborAnalysisData, isLoading: neighborLoading, error: neighborError, refetch: refetchNeighbors } = useQuery({
    queryKey: ['neighborAnalysis', selectedWord, topN],
    queryFn: () => apiService.getNeighborAnalysis(selectedWord, topN),
    enabled: false // Only fetch when explicitly requested
  });

  const { data: trainingStatus, refetch: refetchStatus } = useQuery({
    queryKey: ['trainingStatus', currentSessionId],
    queryFn: () => {
      console.log('Fetching training status for session:', currentSessionId);
      return apiService.getTrainingStatus(currentSessionId!);
    },
    enabled: !!currentSessionId,
    refetchInterval: currentSessionId ? 500 : false, // Poll every 500ms when training for faster updates
  });


  const trainingMutation = useMutation({
    mutationFn: (settings: TrainingSettings) => apiService.trainModels(settings),
    onSuccess: (data) => {
      console.log('Training started:', data);
      console.log('Session ID received:', data.session_id);
      setCurrentSessionId(data.session_id);
      // Start polling for status
      const interval = setInterval(() => {
        console.log('Polling for status...');
        refetchStatus();
      }, 500); // Poll every 500ms for faster updates
      setStatusPollingInterval(interval);
    },
    onError: (error) => {
      console.error('Training failed:', error);
      setCurrentSessionId(null);
    }
  });


  const handleTraining = () => {
    trainingMutation.mutate(trainingSettings);
  };

  // Clean up polling when component unmounts or training completes
  useEffect(() => {
    if (trainingStatus) {
      console.log('Training status update:', trainingStatus);
    }
    if (trainingStatus?.status === 'completed' || trainingStatus?.status === 'failed') {
      if (statusPollingInterval) {
        clearInterval(statusPollingInterval);
        setStatusPollingInterval(null);
      }
      // Don't clear session ID - keep training status visible
    }
  }, [trainingStatus?.status, trainingStatus, statusPollingInterval]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (statusPollingInterval) {
        clearInterval(statusPollingInterval);
      }
    };
  }, [statusPollingInterval]);


  const handleAnalyzeNeighbors = () => {
    if (selectedWord.trim()) {
      refetchNeighbors();
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'training':
        return (
          <div className="space-y-6">
            {/* Training Settings */}
     <div>       
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Vector dimensions"
                  type="number"
                  value={trainingSettings.vector_dim}
                  onChange={(e) => setTrainingSettings(prev => ({ ...prev, vector_dim: parseInt(e.target.value) }))}
                  min="50"
                  max="500"
                  step="50"
                  disabled={!hasActiveSession}
                />
                <Input
                  label="Window size"
                  type="number"
                  value={trainingSettings.window}
                  onChange={(e) => setTrainingSettings(prev => ({ ...prev, window: parseInt(e.target.value) }))}
                  min="5"
                  max="50"
                  disabled={!hasActiveSession}
                />
                <Input
                  label="Minimum count"
                  type="number"
                  value={trainingSettings.min_count}
                  onChange={(e) => setTrainingSettings(prev => ({ ...prev, min_count: parseInt(e.target.value) }))}
                  min="1"
                  max="10"
                  disabled={!hasActiveSession}
                />
                <Input
                  label="Epochs"
                  type="number"
                  value={trainingSettings.epochs}
                  onChange={(e) => setTrainingSettings(prev => ({ ...prev, epochs: parseInt(e.target.value) }))}
                  min="10"
                  max="100"
                  step="5"
                  disabled={!hasActiveSession}
                />
                <Select
                  label="Alignment method"
                  value={trainingSettings.alignment_method}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === "procrustes" || value === "compass") {
                      setTrainingSettings(prev => ({ ...prev, alignment_method: value as "procrustes" | "compass" }));
                    }
                  }}
                  helperText={trainingSettings.alignment_method === "compass" 
                    ? "Uses CADE library for advanced cross-corpus alignment"
                    : "Traditional Procrustes alignment method"
                  }
                  disabled={!hasActiveSession}
                >
                  <option value="procrustes">Procrustes</option>
                  <option value="compass">Compass (CADE)</option>
                </Select>
              </div>
              <Button
                onClick={handleTraining}
                disabled={!hasActiveSession || trainingMutation.isPending}
                variant="primary"
                size="md"
                isLoading={trainingMutation.isPending}
                className="mt-4"
              >
                Train & align with {trainingSettings.alignment_method === 'compass' ? 'CADE' : 'Procrustes'}
              </Button>
            </div>
          </div>
        );

      case 'neighbors':
        return (
          <div>
            <div>
              <p className="text-gray-600 mb-6">
                Neighbors are found by calculating cosine similarity between the word vector and all other word vectors in the corpus. A high cosine similarity means that the words appear in similar contexts in that given corpus.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <Input
                label="Word to analyze"
                type="text"
                value={selectedWord}
                onChange={(e) => setSelectedWord(e.target.value)}
                placeholder="Enter a word to find neighbors"
                disabled={!hasActiveSession}
              />
              <Input
                label="Top N neighbors"
                type="number"
                value={topN}
                onChange={(e) => setTopN(parseInt(e.target.value))}
                min="5"
                max="50"
                disabled={!hasActiveSession}
              />
            </div>

            <Button
              onClick={handleAnalyzeNeighbors}
              disabled={!hasActiveSession || !selectedWord || neighborLoading}
              variant="primary"
              size="md"
              isLoading={neighborLoading}
            >
              List neighbors
            </Button>

            {neighborAnalysisData && (
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="text-md font-semibold text-gray-900 mb-3">
                  Neighbors for "{neighborAnalysisData.word}"
                </h4>
                

                {/* Results by Model */}
                {Object.entries(neighborAnalysisData.models).map(([index, modelInfo]) => (
                  <div key={index} className="mb-4 p-4 bg-white rounded-lg border">
                    <h5 className="text-lg font-medium text-gray-900 mb-3">
                      Index: {index}
                      {modelInfo.word_found && (
                        <span className="ml-2 text-sm text-green-600">
                          (Vocab: {modelInfo.vocabulary_size}, Dim: {modelInfo.vector_dimensions})
                        </span>
                      )}
                    </h5>
                    
                    {modelInfo.word_found ? (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Rank
                              </th>
                              <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Word
                              </th>
                              <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Similarity
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {modelInfo.neighbors?.map((neighbor) => (
                              <tr key={neighbor.rank}>
                                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                                  #{neighbor.rank}
                                </td>
                                <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                                  {neighbor.word}
                                </td>
                                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                                  {neighbor.similarity.toFixed(4)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-sm text-red-600">{modelInfo.message}</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Error Display */}
            {neighborError && (
              <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800">Error analyzing neighbors: {neighborError.message}</p>
              </div>
            )}

          </div>
        );

      case 'similarities':
        return <CosineSimilarityCharts />;

      default:
        return null;
    }
  };

  return (
    <div className="w-full p-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Semantic shift analysis
        </h2>
        <p className="text-gray-600 mb-6">
          Train, align, and compare word embeddings across different corpora.
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('training')}
            disabled={!hasActiveSession}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'training'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } ${!hasActiveSession ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
        Training & alignment
          </button>
         
          <button
            onClick={() => setActiveTab('similarities')}
            disabled={!hasActiveSession}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'similarities'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } ${!hasActiveSession ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            Shift analysis
          </button>
          <button
            onClick={() => setActiveTab('neighbors')}
            disabled={!hasActiveSession}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'neighbors'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } ${!hasActiveSession ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            Find neighbors
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {renderTabContent()}


      {/* Training Status Display */}
      {currentSessionId && trainingStatus && activeTab === 'training' && (
        <div className="mt-6 p-6 bg-blue-50 border border-blue-200 rounded-lg w-1/2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-blue-900">Training status</h3>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              trainingStatus.status === 'running' ? 'bg-blue-100 text-blue-800' :
              trainingStatus.status === 'completed' ? 'bg-green-100 text-green-800' :
              trainingStatus.status === 'failed' ? 'bg-red-100 text-red-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {trainingStatus.status === 'running' ? 'Running' :
               trainingStatus.status === 'completed' ? 'Completed' :
               trainingStatus.status === 'failed' ? 'Failed' :
               trainingStatus.status}
            </span>
          </div>
          
          <div className="space-y-3">

            
            {trainingStatus.progress && (
              <div>
                <div className="flex justify-between text-sm text-blue-600 mb-1">
                <div>
              <p className="text-sm text-blue-700 mb-2">{trainingStatus.message}</p>
            </div>                  <span>{trainingStatus.progress.current_step_number}/{trainingStatus.progress.total_steps}</span>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(trainingStatus.progress.current_step_number / trainingStatus.progress.total_steps) * 100}%` }}
                  ></div>
                </div>
                
              </div>
            )}
            
            
            {trainingStatus.error && (
              <div className="mt-3 p-3 bg-red-100 border border-red-200 rounded">
                <p className="text-sm text-red-800">
                  <strong>Error:</strong> {trainingStatus.error}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Status Messages */}
      {trainingMutation.isSuccess && !currentSessionId && activeTab === 'training' && (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800">Models trained and aligned successfully!</p>
        </div>
      )}

      {trainingMutation.isError && activeTab === 'training' && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">Training and alignment failed: {trainingMutation.error.message}</p>
        </div>
      )}
    </div>
  );
};

export default Word2VecTraining;
