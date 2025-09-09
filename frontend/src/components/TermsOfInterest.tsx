/**
 * Terms of Interest component for managing topics and related terms
 */
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import apiService from '@/services/api';
import { useSession } from '@/hooks/useSession';
import { TopicCreate, TopicUpdate, RelatedTerm, RelatedTermCreate, TopicWithTerms } from '@/types/api';
import { Button, Input, Select } from '@/components/ui';

const TermsOfInterest = () => {
  const { hasActiveSession } = useSession();
  const [action, setAction] = useState<'add-topic' | 'edit-topic' | 'delete-topic' | 'add-term' | 'delete-term'>('add-topic');
  const [newTopicName, setNewTopicName] = useState('');
  const [editingTopic, setEditingTopic] = useState<TopicWithTerms | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<TopicWithTerms | null>(null);
  const [newRelatedTerm, setNewRelatedTerm] = useState('');
  const [deletingTopic, setDeletingTopic] = useState<TopicWithTerms | null>(null);
  const [deletingTerm, setDeletingTerm] = useState<RelatedTerm | null>(null);

  const queryClient = useQueryClient();

  const { data: topicsWithTerms, isLoading } = useQuery({
    queryKey: ['topicsWithTerms'],
    queryFn: () => apiService.getTopicsWithTerms(),
    enabled: hasActiveSession, // Only fetch when session is active
  });

  const createTopicMutation = useMutation({
    mutationFn: (topic: TopicCreate) => apiService.createTopic(topic),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['topicsWithTerms'] });
      setNewTopicName('');
      setAction('add-topic');
    },
  });

  const updateTopicMutation = useMutation({
    mutationFn: ({ id, topic }: { id: number; topic: TopicUpdate }) => 
      apiService.updateTopic(id, topic),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['topicsWithTerms'] });
      setEditingTopic(null);
      setAction('add-topic');
    },
  });

  const deleteTopicMutation = useMutation({
    mutationFn: (topicId: number) => apiService.deleteTopic(topicId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['topicsWithTerms'] });
      setDeletingTopic(null);
      setAction('add-topic');
    },
  });

  const createRelatedTermMutation = useMutation({
    mutationFn: (relatedTerm: RelatedTermCreate) => apiService.addRelatedTerm(relatedTerm.topic_id, relatedTerm),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['topicsWithTerms'] });
      setNewRelatedTerm('');
      setSelectedTopic(null);
      setAction('add-topic');
    },
  });

  const deleteRelatedTermMutation = useMutation({
    mutationFn: (term: RelatedTerm) => apiService.removeRelatedTerm(term.topic_id, term.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['topicsWithTerms'] });
      setDeletingTerm(null);
      setAction('add-topic');
    },
  });

  const handleCreateTopic = () => {
    if (newTopicName.trim()) {
      createTopicMutation.mutate({ name: newTopicName.trim() });
    }
  };

  const handleUpdateTopic = () => {
    if (editingTopic && newTopicName.trim()) {
      updateTopicMutation.mutate({
        id: editingTopic.id,
        topic: { name: newTopicName.trim() }
      });
    }
  };

  const handleDeleteTopic = () => {
    if (deletingTopic) {
      deleteTopicMutation.mutate(deletingTopic.id);
    }
  };

  const handleCreateRelatedTerm = () => {
    if (selectedTopic && newRelatedTerm.trim()) {
      createRelatedTermMutation.mutate({
        topic_id: selectedTopic.id,
        term: newRelatedTerm.trim()
      });
    }
  };

  const handleDeleteRelatedTerm = () => {
    if (deletingTerm) {
      deleteRelatedTermMutation.mutate(deletingTerm);
    }
  };

  const formatTerm = (term: string) => {
    return term.replace(/_/g, ' ');
  };

  return (
    <div className="w-full p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
        Terms of interest
        </h2>
        <p className="text-gray-600 mb-6">
          Add and manage your topics and related terms for the analysis. These terms will be analyzed across different indexes to track semantic evolution.
        </p>
      </div>

      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Current terms</h3>
        
        {!hasActiveSession ? (
          <div className="py-4 text-gray-500">
            Start a session to view and manage terms of interest.
          </div>
        ) : isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading terms...</p>
          </div>
        ) : topicsWithTerms && topicsWithTerms.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-4 py-2 text-left font-semibold">Topics</th>
                  <th className="border border-gray-300 px-4 py-2 text-left font-semibold">Related terms</th>
                  <th className="border border-gray-300 px-4 py-2 text-left font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {topicsWithTerms.map((topic) => (
                  <tr key={topic.id}>
                    <td className="border border-gray-300 px-4 py-2 font-medium">
                      {formatTerm(topic.name)}
                    </td>
                    <td className="border border-gray-300 px-4 py-2">
                      {topic.related_terms.length > 0 ? (
                        <div className="space-y-1">
                          {topic.related_terms.map(term => (
                            <div key={term.id} className="flex items-center justify-between bg-gray-50 px-2 py-1 rounded">
                              <span>{formatTerm(term.term)}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">No related terms</span>
                      )}
                    </td>
                    <td className="border border-gray-300 px-4 py-2">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            setEditingTopic(topic);
                            setNewTopicName(formatTerm(topic.name));
                            setAction('edit-topic');
                          }}
                          className="text-blue-600 hover:text-blue-800 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Edit topic"
                          disabled={!hasActiveSession}
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => {
                            setSelectedTopic(topic);
                            setAction('add-term');
                          }}
                          className="text-green-600 hover:text-green-800 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Add related term"
                          disabled={!hasActiveSession}
                        >
                          ➕
                        </button>
                        <button
                          onClick={() => {
                            setDeletingTopic(topic);
                            setAction('delete-topic');
                          }}
                          className="text-red-600 hover:text-red-800 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Delete topic"
                          disabled={!hasActiveSession}
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-4 text-gray-500">
            No terms defined yet. Add your first topic to get started!
          </div>
        )}
      </div>

      <div className={`border rounded-lg p-6 mb-8 ${hasActiveSession ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200 opacity-60'}`} style={{ width: '80%' }}>
        <h3 className={`text-lg font-semibold mb-4 ${hasActiveSession ? 'text-blue-900' : 'text-gray-600'}`}>Manage terms</h3>
        
        <div className="mb-4">
          <Select
            label="Select action"
            value={action}
            onChange={(e) =>
              setAction(
                e.target.value as
                  | 'add-topic'
                  | 'edit-topic'
                  | 'delete-topic'
                  | 'add-term'
                  | 'delete-term'
              )
            }
            fullWidth
            disabled={!hasActiveSession}
          >
            <option value="add-topic">Add topic</option>
            <option value="edit-topic">Edit topic</option>
            <option value="delete-topic">Delete topic</option>
            <option value="add-term">Add related term</option>
            <option value="delete-term">Delete related term</option>
          </Select>
        </div>

        {/* Add topic */}
        {action === 'add-topic' && (
          <div className="space-y-4">
            <Input
              label="New topic name"
              type="text"
              value={newTopicName}
              onChange={(e) => setNewTopicName(e.target.value)}
              placeholder="Enter topic (1-3 words max)"
              helperText="Enter 1-3 words. Multi-word terms will be joined with underscores."
              disabled={!hasActiveSession}
            />
            <Button
              onClick={handleCreateTopic}
              disabled={!hasActiveSession || !newTopicName.trim() || createTopicMutation.isPending}
              variant="primary"
              size="md"
              isLoading={createTopicMutation.isPending}
            >
              Add topic
            </Button>
          </div>
        )}

        {/* Edit topic */}
        {action === 'edit-topic' && (
          <div className="space-y-4">
            <Select
              label="Select topic to edit"
              value={editingTopic?.id || ''}
              onChange={(e) => {
                const topic = topicsWithTerms?.find(t => t.id === Number(e.target.value));
                setEditingTopic(topic || null);
                setNewTopicName(topic ? formatTerm(topic.name) : '');
              }}
              placeholder="Choose a topic..."
              fullWidth
              disabled={!hasActiveSession}
            >
              {topicsWithTerms?.map(topic => (
                <option key={topic.id} value={topic.id}>
                  {formatTerm(topic.name)}
                </option>
              ))}
            </Select>
            {editingTopic && (
              <>
                <Input
                  label="New topic name"
                  type="text"
                  value={newTopicName}
                  onChange={(e) => setNewTopicName(e.target.value)}
                  placeholder="Enter new topic name"
                  disabled={!hasActiveSession}
                />
                <Button
                  onClick={handleUpdateTopic}
                  disabled={!hasActiveSession || !newTopicName.trim() || updateTopicMutation.isPending}
                  variant="primary"
                  size="md"
                  isLoading={updateTopicMutation.isPending}
                >
                  Update topic
                </Button>
              </>
            )}
          </div>
        )}

        {/* Delete topic */}
        {action === 'delete-topic' && (
          <div className="space-y-4">
            <Select
              label="Select topic to delete"
              value={deletingTopic?.id || ''}
              onChange={(e) => {
                const topic = topicsWithTerms?.find(t => t.id === Number(e.target.value));
                setDeletingTopic(topic || null);
              }}
              placeholder="Choose a topic..."
              fullWidth
              disabled={!hasActiveSession}
            >
              {topicsWithTerms?.map(topic => (
                <option key={topic.id} value={topic.id}>
                  {formatTerm(topic.name)}
                </option>
              ))}
            </Select>
            {deletingTopic && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800">
                  <strong>Warning:</strong> Deleting "{formatTerm(deletingTopic.name)}" will also remove all its related terms. This action cannot be undone.
                </p>
                <Button
                  onClick={handleDeleteTopic}
                  disabled={!hasActiveSession || deleteTopicMutation.isPending}
                  variant="danger"
                  size="md"
                  isLoading={deleteTopicMutation.isPending}
                  className="mt-3"
                >
                  Delete topic
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Add related term */}
        {action === 'add-term' && (
          <div className="space-y-4">
            <Select
              label="Select topic"
              value={selectedTopic?.id || ''}
              onChange={(e) => {
                const topic = topicsWithTerms?.find(t => t.id === Number(e.target.value));
                setSelectedTopic(topic || null);
              }}
              placeholder="Choose a topic..."
              fullWidth
              disabled={!hasActiveSession}
            >
              {topicsWithTerms?.map(topic => (
                <option key={topic.id} value={topic.id}>
                  {formatTerm(topic.name)}
                </option>
              ))}
            </Select>
            {selectedTopic && (
              <>
                <Input
                  label="New related term"
                  type="text"
                  value={newRelatedTerm}
                  onChange={(e) => setNewRelatedTerm(e.target.value)}
                  placeholder="Enter related term (1-3 words max)"
                  helperText="Enter 1-3 words. Multi-word terms will be joined with underscores."
                  disabled={!hasActiveSession}
                />
                <Button
                  onClick={handleCreateRelatedTerm}
                  disabled={!hasActiveSession || !newRelatedTerm.trim() || createRelatedTermMutation.isPending}
                  variant="primary"
                  size="md"
                  isLoading={createRelatedTermMutation.isPending}
                >
                  Add related term
                </Button>
              </>
            )}
          </div>
        )}

        {/* Delete related term */}
        {action === 'delete-term' && (
          <div className="space-y-4">
            <Select
              label="Select topic"
              value={selectedTopic?.id || ''}
              onChange={(e) => {
                const topic = topicsWithTerms?.find(t => t.id === Number(e.target.value));
                setSelectedTopic(topic || null);
              }}
              placeholder="Choose a topic..."
              fullWidth
              disabled={!hasActiveSession}
            >
              {topicsWithTerms?.map(topic => (
                <option key={topic.id} value={topic.id}>
                  {formatTerm(topic.name)}
                </option>
              ))}
            </Select>
            {selectedTopic && (
              <div>
                <Select
                  label="Select related term to delete"
                  value={deletingTerm?.id || ''}
                  onChange={(e) => {
                    const term = selectedTopic.related_terms.find(t => t.id === Number(e.target.value));
                    setDeletingTerm(term || null);
                  }}
                  placeholder="Choose a term..."
                  fullWidth
                  disabled={!hasActiveSession}
                >
                  {selectedTopic.related_terms.map(term => (
                    <option key={term.id} value={term.id}>
                      {formatTerm(term.term)}
                    </option>
                  ))}
                </Select>
                {deletingTerm && (
                  <Button
                    onClick={handleDeleteRelatedTerm}
                    disabled={!hasActiveSession || deleteRelatedTermMutation.isPending}
                    variant="danger"
                    size="md"
                    isLoading={deleteRelatedTermMutation.isPending}
                    className="mt-3"
                  >
                    Delete term
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Status messages */}
      {createTopicMutation.isSuccess && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800">Topic created successfully!</p>
        </div>
      )}
      
      {createTopicMutation.isError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">Failed to create topic: {createTopicMutation.error.message}</p>
        </div>
      )}

      {updateTopicMutation.isSuccess && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800">Topic updated successfully!</p>
        </div>
      )}

      {deleteTopicMutation.isSuccess && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800">Topic deleted successfully!</p>
        </div>
      )}

      {createRelatedTermMutation.isSuccess && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800">Related term added successfully!</p>
        </div>
      )}

      {deleteRelatedTermMutation.isSuccess && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800">Related term deleted successfully!</p>
        </div>
      )}
    </div>
  );
};

export default TermsOfInterest;
