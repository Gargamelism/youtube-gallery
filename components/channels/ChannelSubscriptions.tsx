"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Users, Trash2, Loader2, ExternalLink } from "lucide-react";
import {
  fetchUserChannels,
  fetchChannels,
  subscribeToChannel,
  unsubscribeFromChannel,
  importChannelFromYoutube,
} from "@/services/api";
import { UserChannel, Channel } from "@/types";

export default function ChannelSubscriptions() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [newChannelId, setNewChannelId] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const queryClient = useQueryClient();

  const { data: userChannels, isLoading: isLoadingUserChannels } = useQuery({
    queryKey: ["userChannels"],
    queryFn: fetchUserChannels,
    select: (response) => response.data || { results: [] },
  });

  const { data: allChannels, isLoading: isLoadingAllChannels } = useQuery({
    queryKey: ["allChannels"],
    queryFn: fetchChannels,
    select: (response) => response.data?.results || [],
  });

  const subscribeMutation = useMutation({
    mutationFn: subscribeToChannel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userChannels"] });
      queryClient.invalidateQueries({ queryKey: ["allChannels"] });
    },
  });

  const unsubscribeMutation = useMutation({
    mutationFn: unsubscribeFromChannel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userChannels"] });
      queryClient.invalidateQueries({ queryKey: ["allChannels"] });
    },
  });

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

  const handleSubscribe = async (channelId: string) => {
    try {
      await subscribeMutation.mutateAsync(channelId);
    } catch (error) {
      console.error("Failed to subscribe:", error);
    }
  };

  const handleUnsubscribe = async (subscriptionId: string) => {
    try {
      await unsubscribeMutation.mutateAsync(subscriptionId);
    } catch (error) {
      console.error("Failed to unsubscribe:", error);
    }
  };

  const filteredChannels = allChannels?.filter(
    (channel: Channel) =>
      channel.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      channel.channel_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const subscribedChannelIds = new Set(
    userChannels?.results
      ?.filter((userChannel: UserChannel) => userChannel.is_active)
      ?.map((userChannel: UserChannel) => userChannel.channel) || []
  );

  return (
    <div className="ChannelSubscriptions max-w-6xl mx-auto p-6">
      <div className="ChannelSubscriptions__header flex justify-between items-center mb-8">
        <div className="ChannelSubscriptions__title-section">
          <h1 className="ChannelSubscriptions__title text-3xl font-bold text-gray-900">Channel Subscriptions</h1>
          <p className="ChannelSubscriptions__subtitle text-gray-600 mt-2">Manage your YouTube channel subscriptions</p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="ChannelSubscriptions__add-button flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <Plus className="ChannelSubscriptions__add-icon h-5 w-5 mr-2" />
          Add Channel
        </button>
      </div>

      {/* Subscribed Channels */}
      <div className="ChannelSubscriptions__subscribed-section mb-12">
        <h2 className="ChannelSubscriptions__subscribed-title text-xl font-semibold text-gray-900 mb-6 flex items-center">
          <Users className="ChannelSubscriptions__subscribed-icon h-5 w-5 mr-2" />
          Your Subscriptions (
          {userChannels?.results?.filter((userChannel: UserChannel) => userChannel.is_active)?.length || 0})
        </h2>

        {isLoadingUserChannels ? (
          <div className="ChannelSubscriptions__loading flex items-center justify-center py-12">
            <Loader2 className="ChannelSubscriptions__loading-spinner h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : userChannels?.results?.filter((userChannel: UserChannel) => userChannel.is_active)?.length === 0 ? (
          <div className="ChannelSubscriptions__empty bg-gray-50 rounded-lg p-8 text-center">
            <Users className="ChannelSubscriptions__empty-icon h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="ChannelSubscriptions__empty-title text-lg font-medium text-gray-900 mb-2">
              No subscriptions yet
            </h3>
            <p className="ChannelSubscriptions__empty-description text-gray-600">
              Start by importing a YouTube channel or subscribing to existing ones.
            </p>
          </div>
        ) : (
          <div className="ChannelSubscriptions__grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {userChannels?.results
              ?.filter((userChannel: UserChannel) => userChannel.is_active)
              .map((userChannel: UserChannel) => (
                <div
                  key={userChannel.id}
                  className="ChannelSubscriptions__card bg-white rounded-lg shadow-md p-6 border hover:shadow-lg transition-shadow"
                >
                  <div className="ChannelSubscriptions__card-header flex items-start justify-between mb-4">
                    <div className="ChannelSubscriptions__card-info flex-1">
                      <h3 className="ChannelSubscriptions__card-title text-lg font-semibold text-gray-900 mb-1">
                        {userChannel.channel_title}
                      </h3>
                      <p className="ChannelSubscriptions__card-id text-sm text-gray-500">{userChannel.channel_id}</p>
                    </div>
                    <button
                      onClick={() => handleUnsubscribe(userChannel.id)}
                      disabled={unsubscribeMutation.isPending}
                      className="ChannelSubscriptions__unsubscribe-button p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                      title="Unsubscribe"
                    >
                      <Trash2 className="ChannelSubscriptions__unsubscribe-icon h-4 w-4" />
                    </button>
                  </div>

                  <div className="ChannelSubscriptions__card-meta text-sm text-gray-500 mb-4">
                    Subscribed {new Date(userChannel.subscribed_at).toLocaleDateString()}
                  </div>

                  <a
                    href={`https://youtube.com/channel/${userChannel.channel_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ChannelSubscriptions__card-link inline-flex items-center text-blue-600 hover:text-blue-800 text-sm"
                  >
                    <ExternalLink className="ChannelSubscriptions__card-link-icon h-4 w-4 mr-1" />
                    View on YouTube
                  </a>
                </div>
              ))}
          </div>
        )}
      </div>

      <div className="ChannelSubscriptions__available-section">
        <h2 className="ChannelSubscriptions__available-title text-xl font-semibold text-gray-900 mb-6">
          Available Channels
        </h2>

        <div className="ChannelSubscriptions__search relative mb-6">
          <Search className="ChannelSubscriptions__search-icon absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search channels..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="ChannelSubscriptions__search-input pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {isLoadingAllChannels ? (
          <div className="ChannelSubscriptions__loading flex items-center justify-center py-12">
            <Loader2 className="ChannelSubscriptions__loading-spinner h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="ChannelSubscriptions__available-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredChannels?.map((channel: Channel) => (
              <div
                key={channel.uuid}
                className="ChannelSubscriptions__available-card bg-white rounded-lg shadow-md p-6 border hover:shadow-lg transition-shadow"
              >
                <div className="ChannelSubscriptions__available-header flex items-start justify-between mb-4">
                  <div className="ChannelSubscriptions__available-info flex-1">
                    <h3 className="ChannelSubscriptions__available-title text-lg font-semibold text-gray-900 mb-1">
                      {channel.title}
                    </h3>
                    <p className="ChannelSubscriptions__available-id text-sm text-gray-500 mb-2">
                      {channel.channel_id}
                    </p>
                    {channel.description && (
                      <p className="ChannelSubscriptions__available-description text-sm text-gray-600 line-clamp-2">
                        {channel.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="ChannelSubscriptions__available-stats text-sm text-gray-500 mb-4">
                  <div className="ChannelSubscriptions__stats-item">{channel.total_videos} videos</div>
                </div>

                <div className="ChannelSubscriptions__available-actions flex items-center justify-between">
                  <a
                    href={`https://youtube.com/channel/${channel.channel_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ChannelSubscriptions__external-link inline-flex items-center text-blue-600 hover:text-blue-800 text-sm"
                  >
                    <ExternalLink className="ChannelSubscriptions__external-icon h-4 w-4 mr-1" />
                    YouTube
                  </a>

                  {subscribedChannelIds.has(channel.uuid) ? (
                    <span className="ChannelSubscriptions__subscribed-badge px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full">
                      Subscribed
                    </span>
                  ) : (
                    <button
                      onClick={() => handleSubscribe(channel.uuid)}
                      disabled={subscribeMutation.isPending}
                      className="ChannelSubscriptions__subscribe-button px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      Subscribe
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {isAddModalOpen && (
        <div className="ChannelSubscriptions__modal fixed inset-0 z-50 overflow-y-auto">
          <div className="ChannelSubscriptions__modal-overlay flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="ChannelSubscriptions__modal-backdrop fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={() => setIsAddModalOpen(false)}
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
                  onClick={() => setIsAddModalOpen(false)}
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
      )}
    </div>
  );
}
