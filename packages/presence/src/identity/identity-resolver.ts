/**
 * Identity Resolver - Simplified single-tenant version
 *
 * Resolution Flow:
 * 1. Find identity by channel via ChannelBindingStore
 * 2. If not exists: create identity + channel binding
 * 3. Update display name if profile name changed
 */

import type {
  ConversationalIdentity,
  IdentityResolutionContext,
  IdentityResolutionResult,
} from './types.js';
import type { IdentityStore, CreateIdentityInput } from './identity-store.js';
import type { ChannelBindingStore, BindChannelInput } from './channel-binding-store.js';

export interface IdentityResolverConfig {
  defaultDisplayName?: string;
}

const DEFAULT_CONFIG: IdentityResolverConfig = {
  defaultDisplayName: 'Unknown User',
};

export interface IdentityResolverDependencies {
  identityStore: IdentityStore;
  channelBindingStore: ChannelBindingStore;
}

export class IdentityResolver {
  private readonly identityStore: IdentityStore;
  private readonly channelBindingStore: ChannelBindingStore;
  private readonly config: IdentityResolverConfig;

  constructor(deps: IdentityResolverDependencies, config?: IdentityResolverConfig) {
    this.identityStore = deps.identityStore;
    this.channelBindingStore = deps.channelBindingStore;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async resolve(context: IdentityResolutionContext): Promise<IdentityResolutionResult> {
    const { channel, channelIdentifier } = context;

    const channelLookup = await this.channelBindingStore.findIdentityByChannel(
      channel,
      channelIdentifier
    );

    let identity: ConversationalIdentity;
    let wasCreated = false;

    if (channelLookup) {
      const existingIdentity = await this.identityStore.get(channelLookup.identityId);

      if (existingIdentity) {
        identity = existingIdentity;

        const profileName = context.metadata?.['profileName'] as string | undefined;
        if (profileName && profileName !== identity.displayName) {
          identity = await this.identityStore.update({ ...identity, displayName: profileName });
        }
      } else {
        identity = await this.createNewIdentity(context);
        wasCreated = true;
      }
    } else {
      identity = await this.createNewIdentity(context);
      wasCreated = true;
    }

    return { identity, wasCreated };
  }

  private async createNewIdentity(context: IdentityResolutionContext): Promise<ConversationalIdentity> {
    const { channel, channelIdentifier, metadata } = context;

    const profileName = metadata?.['profileName'] as string | undefined;
    const displayName = profileName ?? this.config.defaultDisplayName ?? 'Unknown User';

    const identityInput: CreateIdentityInput = {
      type: 'human',
      displayName,
      channels: [],
    };

    const identity = await this.identityStore.create(identityInput);

    const bindingInput: BindChannelInput = {
      channel,
      channelIdentifier,
      status: 'active',
    };

    if (metadata) bindingInput.metadata = metadata;

    await this.channelBindingStore.bind(identity.id, bindingInput);

    const binding = {
      channel,
      channelIdentifier,
      boundAt: new Date().toISOString(),
      status: 'active' as const,
    };

    return { ...identity, channels: [binding] };
  }

  async getIdentity(identityId: string): Promise<ConversationalIdentity | null> {
    return this.identityStore.get(identityId);
  }

  async getChannelBindings(identityId: string) {
    return this.channelBindingStore.getBindingsForIdentity(identityId);
  }
}
