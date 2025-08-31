"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Users, Trash2, Loader2, ExternalLink } from "lucide-react";
import { fetchUserChannels, fetchChannels } from "@/services/api";
import { UserChannel, Channel } from "@/types";
import AvailableChannelCard from "./AvailableChannelCard";
import ImportChannelModal from "./ImportChannelModal";
import { useChannelUnsubscribe, useChannelSubscribe } from "./mutations";

export default function ChannelSubscriptions() {
  const [isAddChannelModalOpen, setIsAddChannelModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const queryClient = useQueryClient();
  const unsubscribeMutation = useChannelUnsubscribe(queryClient);
  const subscribeMutation = useChannelSubscribe(queryClient);

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

  const handleChannelUnsubscribe = async (channelId: string) => {
    return await unsubscribeMutation.mutateAsync(channelId);
  };

  const handleChannelSubscribe = async (channelId: string) => {
    return await subscribeMutation.mutateAsync(channelId);
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
          onClick={() => setIsAddChannelModalOpen(true)}
          className="ChannelSubscriptions__add-button flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <Plus className="ChannelSubscriptions__add-icon h-5 w-5 mr-2" />
          Add Channel
        </button>
      </div>

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
                      onClick={() => handleChannelUnsubscribe(userChannel.id)}
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
          <AvailableChannelCard
            subscribedChannelIds={subscribedChannelIds}
            filteredChannels={filteredChannels}
            handleSubscribe={(channelId: string) => handleChannelSubscribe(channelId)}
            canSubscribe={subscribeMutation.isPending}
          />
        )}
      </div>

      <ImportChannelModal isOpen={isAddChannelModalOpen} onClose={() => setIsAddChannelModalOpen(false)} />
    </div>
  );
}
