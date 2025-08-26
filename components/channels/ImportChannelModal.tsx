import { useState } from "react";
import { importChannelFromYoutube } from "@/services/api";

export interface ImportChannelModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ImportChannelModal({ isOpen, onClose }: ImportChannelModalProps) {
  if (!isOpen) return null;

  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [newChannelId, setNewChannelId] = useState("");

  const handleImportChannel = async () => {
    if (!newChannelId.trim()) return;

    setIsImporting(true);
    setImportError(null);

    try {
      const response = await importChannelFromYoutube(newChannelId);

      if (response.error) {
        setImportError(response.error);
      } else {
        // Auto-subscribe to imported channel
        await subscribeMutation.mutateAsync(response.data.uuid);
        setNewChannelId("");
        setIsAddModalOpen(false);
        queryClient.invalidateQueries({ queryKey: ["allChannels"] });
      }
    } catch (error) {
      setImportError("Failed to import channel. Please try again.");
      console.error("Import error:", error);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="ChannelSubscriptions__modal fixed inset-0 z-50 overflow-y-auto">
      <div className="ChannelSubscriptions__modal-overlay flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div
          className="ChannelSubscriptions__modal-backdrop fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />

        <div className="ChannelSubscriptions__modal-content inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
          <div className="ChannelSubscriptions__modal-header mb-4">
            <h3 className="ChannelSubscriptions__modal-title text-lg font-medium text-gray-900">
              Import YouTube Channel
            </h3>
            <p className="ChannelSubscriptions__modal-description text-sm text-gray-500 mt-1">
              Enter a YouTube channel ID to import and subscribe to it.
            </p>
          </div>

          {importError && (
            <div className="ChannelSubscriptions__error bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              {importError}
            </div>
          )}

          <div className="ChannelSubscriptions__modal-form">
            <label
              htmlFor="channelId"
              className="ChannelSubscriptions__form-label block text-sm font-medium text-gray-700 mb-2"
            >
              YouTube Channel ID
            </label>
            <input
              type="text"
              id="channelId"
              value={newChannelId}
              onChange={(e) => setNewChannelId(e.target.value)}
              placeholder="UC.../@..."
              className="ChannelSubscriptions__form-input w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="ChannelSubscriptions__form-help text-xs text-gray-500 mt-1">
              You can find the channel ID in the YouTube URL or channel about page.
            </p>
          </div>

          <div className="ChannelSubscriptions__modal-actions flex justify-end space-x-3 mt-6">
            <button
              onClick={onClose}
              className="ChannelSubscriptions__cancel-button px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleImportChannel}
              disabled={isImporting || !newChannelId.trim()}
              className="ChannelSubscriptions__import-button flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isImporting ? (
                <>
                  <Loader2 className="ChannelSubscriptions__import-spinner h-4 w-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                "Import & Subscribe"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
