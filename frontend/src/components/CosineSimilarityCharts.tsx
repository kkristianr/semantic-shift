/**
 * Cosine Similarity Charts component for visualizing semantic evolution
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiService from '@/services/api';
import { useSession } from '@/hooks/useSession';
import { CosineSimilarityData } from '@/types/api';

const CosineSimilarityCharts = () => {
  const { hasActiveSession } = useSession();
  const [openSection, setOpenSection] = useState<string | null>(null);

  const toggleSection = (section: string) => {
    setOpenSection(openSection === section ? null : section);
  };

  // Fetch cosine similarity data automatically when session is active
  const { data: similarityData, isLoading, error } = useQuery({
    queryKey: ['cosineSimilarities'],
    queryFn: () => apiService.getCosineSimilarities(),
    enabled: hasActiveSession, // Automatically fetch when session is active
  });

  const formatTerm = (term: string) => {
    return term.replace(/_/g, ' ');
  };

  const getUniqueTopics = (data: CosineSimilarityData[]) => {
    return [...new Set(data.map(item => item.main_topic))];
  };

  const getUniqueIndexes = (data: CosineSimilarityData[]) => {
    return [...new Set(data.map(item => item.index))].sort();
  };

  const filterDataByTopic = (data: CosineSimilarityData[], topic: string) => {
    return data.filter(item => item.main_topic === topic);
  };

  const renderLineChart = (topic: string, data: CosineSimilarityData[]) => {
    const topicData = filterDataByTopic(data, topic);
    const indexes = getUniqueIndexes(data);
    
    // Group by related term
    const termGroups = new Map<string, CosineSimilarityData[]>();
    topicData.forEach(item => {
      if (!termGroups.has(item.related_term)) {
        termGroups.set(item.related_term, []);
      }
      termGroups.get(item.related_term)!.push(item);
    });

    return (
      <div key={topic} className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">
          Semantic analysis for {formatTerm(topic)} 
        </h3>
      

        {/* Line Chart Visualization */}
        <div className="w-full h-80 bg-gray-50 rounded-lg p-4 mb-4">
          <svg width="100%" height="100%" viewBox="0 0 800 300">
            {/* Chart background */}
            <rect width="100%" height="100%" fill="#f9fafb" rx="8" ry="8" />
            
            {/* Y-axis (similarity values) */}
            <line x1="60" y1="40" x2="60" y2="260" stroke="#d1d5db" strokeWidth="2" />
            <text x="20" y="150" textAnchor="middle" transform="rotate(-90, 30, 150)" className="text-xs fill-gray-600">
              Cosine similarity
            </text>
            
            {/* Y-axis labels */}
            {[0, 0.25, 0.5, 0.75, 1.0].map((value, i) => (
              <g key={value}>
                <line x1="55" y1={260 - i * 55} x2="60" y2={260 - i * 55} stroke="#d1d5db" strokeWidth="1" />
                <text x="50" y={260 - i * 55 + 4} textAnchor="end" className="text-xs fill-gray-600">
                  {value.toFixed(2)}
                </text>
              </g>
            ))}
            
            {/* X-axis (indexes) */}
            <line x1="60" y1="260" x2="740" y2="260" stroke="#d1d5db" strokeWidth="2" />
            <text x="400" y="290" textAnchor="middle" className="text-xs fill-gray-600">
              Time Periods
            </text>
            
            {/* X-axis labels */}
            {indexes.map((index, i) => (
              <g key={index}>
                <line x1={60 + i * (680 / (indexes.length - 1))} y1="260" x2={60 + i * (680 / (indexes.length - 1))} y2="265" stroke="#d1d5db" strokeWidth="1" />
                <text x={60 + i * (680 / (indexes.length - 1))} y="280" textAnchor="middle" className="text-xs fill-gray-600">
                  {index}
                </text>
              </g>
            ))}
            
            {/* Plot lines for each related term */}
            {Array.from(termGroups.entries()).map(([term, termData], termIndex) => {
              const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
              const color = colors[termIndex % colors.length];
              
              // Sort by index for proper line drawing
              const sortedData = termData.sort((a, b) => {
                const indexA = indexes.indexOf(a.index);
                const indexB = indexes.indexOf(b.index);
                return indexA - indexB;
              });
              
              // Create path for the line
              const points = sortedData
                .filter(item => item.similarity !== null)
                .map((item, i) => {
                  const x = 60 + indexes.indexOf(item.index) * (680 / (indexes.length - 1));
                  const y = 260 - (item.similarity || 0) * 220;
                  return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                })
                .join(' ');
              
              return (
                <g key={term}>
                  {/* Line */}
                  <path d={points} stroke={color} strokeWidth="2" fill="none" />
                  
                  {/* Points */}
                  {sortedData
                    .filter(item => item.similarity !== null)
                    .map((item) => {
                      const x = 60 + indexes.indexOf(item.index) * (680 / (indexes.length - 1));
                      const y = 260 - (item.similarity || 0) * 220;
                      return (
                        <circle
                          key={`${item.index}-${item.related_term}`}
                          cx={x}
                          cy={y}
                          r="4"
                          fill={color}
                          stroke="white"
                          strokeWidth="2"
                        />
                      );
                    })}
                  
                  {/* Legend */}
                  <circle cx="650" cy={40 + termIndex * 20} r="6" fill={color} />
                  <text x="665" y={45 + termIndex * 20} className="text-sm fill-gray-700">
                    {formatTerm(term)}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-4 py-2 text-left font-semibold">Related term</th>
                {indexes.map(index => (
                  <th key={index} className="border border-gray-300 px-4 py-2 text-center font-semibold">
                    {index}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from(termGroups.entries()).map(([term, termData]) => (
                <tr key={term}>
                  <td className="border border-gray-300 px-4 py-2 font-medium">
                    {formatTerm(term)}
                  </td>
                  {indexes.map(index => {
                    const item = termData.find(d => d.index === index);
                    const similarity = item?.similarity;
                    return (
                      <td key={index} className="border border-gray-300 px-4 py-2 text-center">
                        {similarity !== null && similarity !== undefined ? (
                          <span className={`font-mono ${similarity > 0.7 ? 'text-green-600' : similarity > 0.4 ? 'text-yellow-600' : 'text-red-600'}`}>
                            {similarity.toFixed(3)}
                          </span>
                        ) : (
                          <span className="text-gray-400 italic">N/A</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">Calculating cosine similarities...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <p className="text-red-800">Error loading cosine similarity data: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div>
        <p className="text-gray-600">
          Visualize how semantic relationships between topics and related terms evolve across different time periods.
          This analysis uses aligned word embeddings to ensure comparability across vector spaces.
        </p>
        
        {/* How to interpret the results - Accordion Section */}
        <div className="mb-6">
          <button
            onClick={() => toggleSection('interpretation')}
            className="w-full py-4 text-left flex items-center"
          >

            <h2 className="text-md font-semibold text-gray-700">How to interpret the results?</h2>
            <span className="text-gray-500 text-md font-semibold ml-1">
              {openSection === 'interpretation' ? '-' : '+'}
            </span>
          </button>
          
          {openSection === 'interpretation' && (
            <div className="px-3 pb-3">
              <div className="text-gray-700 leading-relaxed">
                <ul className="text-gray-700 text-sm space-y-2">
                  <li>• <strong>Cosine similarity ranges from -1 to 1:</strong> Higher values indicate stronger semantic similarity</li>
                  <li>• <strong>Values close to 1:</strong> Topic and related term are used in very similar contexts</li>
                  <li>• <strong>Values close to 0:</strong> Topic and related term are used in different contexts</li>
                  <li>• <strong>Values close to -1:</strong> Topic and related term are used in opposite contexts</li>
                  <li>• <strong>N/A values:</strong> Words not found in the vocabulary for that time period</li>
                </ul>
              </div>
            </div>
          )}
        </div>

      </div>

      {similarityData && similarityData.similarities.length > 0 && (
        <div>

          {/* Render charts for all topics */}
          {getUniqueTopics(similarityData.similarities).map(topic => 
            renderLineChart(topic, similarityData.similarities)
          )}
        </div>
      )}

      {similarityData && similarityData.similarities.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No similarity data available. Make sure you have:
          <ul className="mt-2 text-sm space-y-1">
            <li>• Uploaded data with different indexes</li>
            <li>• Trained and aligned Word2Vec models</li>
            <li>• Defined topics and related terms</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default CosineSimilarityCharts;
