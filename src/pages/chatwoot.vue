<template>
  <v-container class="py-8 chatwoot-page">
    <v-row>
      <v-col cols="12" md="4">
        <v-card>
          <v-card-title>
            <div class="d-flex align-center justify-space-between w-100">
              <span>Chatwoot 配置</span>
              <v-btn
                icon
                size="small"
                variant="text"
                :loading="loadingInbox"
                :disabled="!hasConnectionConfig"
                @click="fetchInboxDetails"
              >
                <v-icon size="20">mdi-refresh</v-icon>
              </v-btn>
            </div>
          </v-card-title>
          <v-card-text>
            <v-text-field
              v-model="baseUrl"
              label="Chatwoot Base URL"
              placeholder="https://app.chatwoot.com"
              prepend-inner-icon="mdi-earth"
            />
            <v-text-field
              v-model="inboxIdentifier"
              label="Inbox Identifier"
              prepend-inner-icon="mdi-inbox"
            />
            <v-alert
              v-if="inboxDetails"
              type="info"
              variant="tonal"
              class="mt-4"
            >
              <div class="text-subtitle-2">{{ inboxDetails.name || `Inbox #${inboxDetails.id}` }}</div>
              <div class="text-caption text-medium-emphasis">渠道：{{ inboxDetails.channel_type }}</div>
            </v-alert>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="8">
        <v-card>
          <v-card-title>
            <div class="d-flex align-center justify-space-between w-100">
              <span>联系人</span>
              <div class="d-flex ga-2">
                <v-btn
                  color="primary"
                  variant="flat"
                  :loading="creatingContact"
                  @click="createOrUpdateContact"
                >
                  {{ contactIdentifier ? '更新联系人' : '创建联系人' }}
                </v-btn>
                <v-btn
                  variant="tonal"
                  :loading="loadingContact"
                  :disabled="!contactIdentifier"
                  @click="loadExistingContact"
                >
                  重新获取
                </v-btn>
              </div>
            </div>
          </v-card-title>
          <v-card-text>
            <v-text-field
              v-model="contactIdentifier"
              label="Contact Source ID"
              persistent-hint
              hint="从创建接口返回的 source_id"
              prepend-inner-icon="mdi-identifier"
            />
            <v-text-field
              v-model="contactForm.identifier"
              label="外部标识 identifier"
              prepend-inner-icon="mdi-account-key"
            />
            <v-text-field
              v-model="contactForm.name"
              label="姓名"
              prepend-inner-icon="mdi-account"
            />
            <v-text-field
              v-model="contactForm.email"
              label="Email"
              prepend-inner-icon="mdi-email"
            />
            <v-text-field
              v-model="contactForm.phone_number"
              label="电话"
              prepend-inner-icon="mdi-phone"
            />
            <div class="text-caption text-medium-emphasis mt-2">
              创建成功会自动填入 Source ID，后续会话操作依赖该字段。
            </div>
            <v-alert
              v-if="contactDetails"
              type="success"
              variant="tonal"
              class="mt-4"
            >
              <div>ID：{{ contactDetails.id }}</div>
              <div>Source ID：{{ contactDetails.source_id }}</div>
              <div v-if="contactDetails.email">Email：{{ contactDetails.email }}</div>
            </v-alert>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-row class="mt-4">
      <v-col cols="12" md="4">
        <v-card>
          <v-card-title>
            <div class="d-flex align-center justify-space-between w-100">
              <span>会话</span>
              <div class="d-flex ga-1">
                <v-btn
                  icon
                  size="small"
                  variant="text"
                  :loading="loadingConversations"
                  :disabled="!contactReady"
                  @click="() => loadConversations({ refreshMessages: true })"
                >
                  <v-icon size="20">mdi-refresh</v-icon>
                </v-btn>
                <v-btn
                  icon
                  size="small"
                  variant="text"
                  color="primary"
                  :loading="creatingConversation"
                  :disabled="!contactReady"
                  @click="createConversation"
                >
                  <v-icon size="20">mdi-plus</v-icon>
                </v-btn>
              </div>
            </div>
          </v-card-title>
          <v-divider />
          <v-card-text class="py-0">
            <v-list nav density="comfortable">
              <v-list-item
                v-for="conversation in conversations"
                :key="conversation.id"
                :value="conversation.id"
                :active="conversation.id === selectedConversationId"
                @click="selectConversation(conversation.id)"
              >
                <template #title>
                  <div class="d-flex flex-column">
                    <span class="font-weight-medium">#{{ conversation.id }}</span>
                    <span
                      v-if="conversation.latestMessage"
                      class="text-caption text-medium-emphasis ellipsis"
                    >
                      {{ conversation.latestMessage }}
                    </span>
                  </div>
                </template>
                <template #subtitle>
                  <span class="text-caption text-disabled">
                    {{ formatTimestamp(conversation.updated_at || conversation.created_at) }}
                  </span>
                </template>
              </v-list-item>
              <v-list-item v-if="!loadingConversations && !conversations.length">
                <v-list-item-title class="text-medium-emphasis">暂无会话</v-list-item-title>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="8">
        <v-card class="conversation-card">
          <v-card-title class="d-flex justify-space-between align-center">
            <span v-if="selectedConversationId">会话 #{{ selectedConversationId }}</span>
            <span v-else>选择一个会话以查看消息</span>
            <v-btn
              v-if="selectedConversationId"
              variant="text"
              color="success"
              size="small"
              :loading="resolvingConversation"
              @click="resolveConversation"
            >
              设为已解决
            </v-btn>
          </v-card-title>
          <v-divider />
          <v-card-text class="conversation-messages">
            <div v-if="loadingMessages" class="text-center py-6">
              <v-progress-circular indeterminate color="primary" />
            </div>
            <template v-else>
              <div
                v-for="message in messages"
                :key="message.id"
                class="message-row"
                :class="message.sender_type === 'contact' ? 'from-contact' : 'from-agent'"
              >
                <div class="message-meta">
                  <span class="message-sender">{{ message.sender_type === 'contact' ? '访客' : '坐席' }}</span>
                  <span class="message-time">{{ formatTimestamp(message.created_at) }}</span>
                </div>
                <div class="message-content">
                  <pre>{{ message.content || '(无文本内容)' }}</pre>
                </div>
              </div>
              <div v-if="!messages.length" class="text-center text-medium-emphasis py-6">
                暂无消息
              </div>
            </template>
          </v-card-text>
          <v-divider />
          <v-card-text>
            <v-form @submit.prevent="sendMessage">
              <v-textarea
                v-model="messageBody"
                label="发送消息"
                rows="3"
                auto-grow
                :disabled="!selectedConversationId"
              />
              <div class="d-flex justify-end">
                <v-btn
                  type="submit"
                  color="primary"
                  :disabled="!selectedConversationId || !messageBody.trim()"
                  :loading="sendingMessage"
                >
                  发送
                </v-btn>
              </div>
            </v-form>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { reactive, ref, computed, watch, onMounted, getCurrentInstance } from 'vue';
import axios from 'axios';

const defaultInbox = 'UJJfBp1gvojFcUJUor189i8U';
const storageKey = 'cw-chatwoot-console';

const baseUrl = ref('https://app.chatwoot.com');
const inboxIdentifier = ref(defaultInbox);
const contactIdentifier = ref('');
const contactForm = reactive({
  identifier: '',
  name: '',
  email: '',
  phone_number: '',
});

const inboxDetails = ref(null);
const contactDetails = ref(null);
const conversations = ref([]);
const selectedConversationId = ref(null);
const messages = ref([]);
const messageBody = ref('');

const loadingInbox = ref(false);
const creatingContact = ref(false);
const loadingContact = ref(false);
const loadingConversations = ref(false);
const creatingConversation = ref(false);
const loadingMessages = ref(false);
const sendingMessage = ref(false);
const resolvingConversation = ref(false);

const instance = getCurrentInstance();
const messenger = instance?.appContext.config.globalProperties.$message;
const notify = {
  success: (title, content) => {
    if (messenger?.success) {
      messenger.success(title, content);
    } else {
      console.info(title, content);
    }
  },
  error: (title, content) => {
    if (messenger?.error) {
      messenger.error(title, content);
    } else {
      console.error(title, content);
    }
  },
  info: (title, content) => {
    if (messenger?.info) {
      messenger.info(title, content);
    } else {
      console.log(title, content);
    }
  },
};

const normalizedBaseUrl = computed(() => {
  const value = baseUrl.value.trim();
  if (!value) return '';
  return value.endsWith('/') ? value.slice(0, -1) : value;
});

const hasConnectionConfig = computed(() => Boolean(normalizedBaseUrl.value && inboxIdentifier.value.trim()));
const inboxBaseUrl = computed(() => {
  if (!hasConnectionConfig.value) return '';
  const inboxId = encodeURIComponent(inboxIdentifier.value.trim());
  return `${normalizedBaseUrl.value}/public/api/v1/inboxes/${inboxId}`;
});
const contactReady = computed(() => hasConnectionConfig.value && Boolean(contactIdentifier.value.trim()));

const hasHydrated = ref(false);

onMounted(() => {
  if (typeof window === 'undefined') return;
  try {
    const cached = window.localStorage.getItem(storageKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed.baseUrl) baseUrl.value = parsed.baseUrl;
      if (parsed.inboxIdentifier) inboxIdentifier.value = parsed.inboxIdentifier;
      if (parsed.contactIdentifier) contactIdentifier.value = parsed.contactIdentifier;
      if (parsed.contactForm) {
        Object.assign(contactForm, parsed.contactForm);
      }
    }
  } catch (error) {
    console.warn('无法解析缓存的 Chatwoot 配置', error);
  } finally {
    hasHydrated.value = true;
    if (hasConnectionConfig.value) {
      fetchInboxDetails();
    }
    if (contactReady.value) {
      loadExistingContact();
    }
  }
});

const persistState = () => {
  if (!hasHydrated.value || typeof window === 'undefined') return;
  const payload = {
    baseUrl: baseUrl.value,
    inboxIdentifier: inboxIdentifier.value,
    contactIdentifier: contactIdentifier.value,
    contactForm: { ...contactForm },
  };
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(payload));
  } catch (error) {
    console.warn('保存 Chatwoot 配置失败', error);
  }
};

watch([
  baseUrl,
  inboxIdentifier,
  contactIdentifier,
  () => contactForm.identifier,
  () => contactForm.name,
  () => contactForm.email,
  () => contactForm.phone_number,
], persistState);

const ensureConnection = () => {
  if (!hasConnectionConfig.value) {
    notify.error('缺少配置', '请先填写 Base URL 与 Inbox Identifier');
    return false;
  }
  return true;
};

const ensureContact = () => {
  if (!contactReady.value) {
    notify.error('缺少联系人信息', '请先创建联系人，或填入已有的 Source ID');
    return false;
  }
  return true;
};

const extractErrorMessage = (error) => {
  if (error.response?.data) {
    const data = error.response.data;
    if (typeof data === 'string') return data;
    if (data.message) return data.message;
    if (data.error) return data.error;
    if (Array.isArray(data.errors)) return data.errors.join(', ');
  }
  return error.message || '未知错误';
};

const fetchInboxDetails = async () => {
  if (!ensureConnection()) return;
  loadingInbox.value = true;
  try {
    const { data } = await axios.get(inboxBaseUrl.value);
    inboxDetails.value = data;
    notify.success('已获取 Inbox 信息', inboxDetails.value.name || `Inbox #${inboxDetails.value.id}`);
  } catch (error) {
    notify.error('获取 Inbox 失败', extractErrorMessage(error));
  } finally {
    loadingInbox.value = false;
  }
};

const createOrUpdateContact = async () => {
  if (!ensureConnection()) return;
  const payload = Object.fromEntries(
    Object.entries(contactForm)
      .filter(([, value]) => Boolean(value?.toString().trim()))
  );

  if (!payload.identifier && !payload.email) {
    notify.error('缺少必填字段', '创建联系人至少需要 identifier 或 email');
    return;
  }

  creatingContact.value = true;
  try {
    const hadIdentifier = Boolean(contactIdentifier.value);
    if (hadIdentifier) {
      const url = `${inboxBaseUrl.value}/contacts/${encodeURIComponent(contactIdentifier.value.trim())}`;
      const { data } = await axios.patch(url, payload);
      contactDetails.value = data;
      notify.success('联系人已更新', `Source ID：${data.source_id}`);
    } else {
      const { data } = await axios.post(`${inboxBaseUrl.value}/contacts`, payload);
      contactDetails.value = data;
      contactIdentifier.value = data.source_id;
      notify.success('联系人已创建', `Source ID：${data.source_id}`);
    }
    await loadConversations({ preserveSelection: hadIdentifier, refreshMessages: true });
  } catch (error) {
    notify.error('提交联系人失败', extractErrorMessage(error));
  } finally {
    creatingContact.value = false;
  }
};

const loadExistingContact = async () => {
  if (!ensureConnection() || !contactIdentifier.value) return;
  loadingContact.value = true;
  try {
    const url = `${inboxBaseUrl.value}/contacts/${encodeURIComponent(contactIdentifier.value.trim())}`;
    const { data } = await axios.get(url);
    contactDetails.value = data;
    notify.success('已获取联系人', data.name || data.source_id);
    await loadConversations({ preserveSelection: false, refreshMessages: true });
  } catch (error) {
    notify.error('获取联系人失败', extractErrorMessage(error));
  } finally {
    loadingContact.value = false;
  }
};

const loadConversations = async (options = {}) => {
  if (!ensureContact()) return;
  const { preserveSelection = true, refreshMessages = false } = options;
  loadingConversations.value = true;
  try {
    const url = `${inboxBaseUrl.value}/contacts/${encodeURIComponent(contactIdentifier.value.trim())}/conversations`;
    const { data } = await axios.get(url);
    const normalized = (Array.isArray(data) ? data : []).map((item) => {
      const latestMessage = item.messages?.length ? item.messages[item.messages.length - 1].content : '';
      return {
        ...item,
        latestMessage,
      };
    });
    conversations.value = normalized;

    const hasSelection = normalized.some((conv) => conv.id === selectedConversationId.value);
    if (!preserveSelection || !selectedConversationId.value || !hasSelection) {
      selectedConversationId.value = normalized[0]?.id ?? null;
    }

    if (selectedConversationId.value) {
      if (!hasSelection || refreshMessages || !preserveSelection) {
        await fetchMessages(selectedConversationId.value);
      }
    } else {
      messages.value = [];
    }
  } catch (error) {
    notify.error('加载会话失败', extractErrorMessage(error));
  } finally {
    loadingConversations.value = false;
  }
};

const createConversation = async () => {
  if (!ensureContact()) return;
  creatingConversation.value = true;
  try {
    const url = `${inboxBaseUrl.value}/contacts/${encodeURIComponent(contactIdentifier.value.trim())}/conversations`;
    const { data } = await axios.post(url, {});
    notify.success('会话已创建', `ID：${data.id}`);
    await loadConversations({ preserveSelection: true });
    selectedConversationId.value = data.id;
    await fetchMessages(data.id);
  } catch (error) {
    notify.error('创建会话失败', extractErrorMessage(error));
  } finally {
    creatingConversation.value = false;
  }
};

const fetchMessages = async (conversationId = selectedConversationId.value) => {
  if (!ensureContact() || !conversationId) return;
  loadingMessages.value = true;
  try {
    const url = `${inboxBaseUrl.value}/contacts/${encodeURIComponent(contactIdentifier.value.trim())}/conversations/${conversationId}/messages`;
    const { data } = await axios.get(url);
    const sorted = (Array.isArray(data) ? data : [])
      .map((msg) => ({
        ...msg,
        sender_type: msg.sender_type || (msg.message_type === 1 ? 'agent' : 'contact'),
      }))
      .sort((a, b) => (a.created_at ?? 0) - (b.created_at ?? 0));
    messages.value = sorted;
    await updateLastSeen(conversationId);
  } catch (error) {
    notify.error('加载消息失败', extractErrorMessage(error));
  } finally {
    loadingMessages.value = false;
  }
};

const updateLastSeen = async (conversationId) => {
  try {
    const url = `${inboxBaseUrl.value}/contacts/${encodeURIComponent(contactIdentifier.value.trim())}/conversations/${conversationId}/update_last_seen`;
    await axios.post(url);
  } catch (error) {
    console.debug('更新已读状态失败，可忽略', error);
  }
};

const resolveConversation = async () => {
  if (!ensureContact() || !selectedConversationId.value) return;
  resolvingConversation.value = true;
  try {
    const url = `${inboxBaseUrl.value}/contacts/${encodeURIComponent(contactIdentifier.value.trim())}/conversations/${selectedConversationId.value}/toggle_status`;
    await axios.post(url);
    notify.success('会话已设置为已解决', `ID：${selectedConversationId.value}`);
    await loadConversations({ preserveSelection: true, refreshMessages: true });
  } catch (error) {
    notify.error('更新会话状态失败', extractErrorMessage(error));
  } finally {
    resolvingConversation.value = false;
  }
};

const selectConversation = async (conversationId) => {
  if (selectedConversationId.value === conversationId) return;
  selectedConversationId.value = conversationId;
  await fetchMessages(conversationId);
};

const sendMessage = async () => {
  if (!ensureContact() || !selectedConversationId.value) return;
  const content = messageBody.value.trim();
  if (!content) return;
  sendingMessage.value = true;
  try {
    const url = `${inboxBaseUrl.value}/contacts/${encodeURIComponent(contactIdentifier.value.trim())}/conversations/${selectedConversationId.value}/messages`;
    await axios.post(url, { content });
    messageBody.value = '';
    await fetchMessages(selectedConversationId.value);
    await loadConversations({ preserveSelection: true });
  } catch (error) {
    notify.error('发送消息失败', extractErrorMessage(error));
  } finally {
    sendingMessage.value = false;
  }
};

const formatTimestamp = (timestamp) => {
  if (!timestamp) return '';
  try {
    const date = new Date(timestamp * 1000);
    if (Number.isNaN(date.getTime())) return '';
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
  } catch (error) {
    return '';
  }
};
</script>

<style scoped>
.chatwoot-page {
  min-height: 100vh;
}

.conversation-card {
  display: flex;
  flex-direction: column;
  min-height: 440px;
}

.conversation-messages {
  flex: 1;
  overflow-y: auto;
  background: var(--v-theme-surface-variant, #f5f5f5);
  border-radius: 12px;
  padding: 16px;
  border: 1px solid rgba(0, 0, 0, 0.06);
}

.message-row {
  max-width: 72%;
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 16px;
}

.message-row.from-agent {
  align-self: flex-end;
  text-align: right;
}

.message-row.from-contact {
  align-self: flex-start;
  text-align: left;
}

.message-meta {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--v-theme-on-surface, #424242);
  opacity: 0.65;
}

.message-content {
  border-radius: 10px;
  padding: 10px 12px;
  background: var(--v-theme-surface, #ffffff);
  color: var(--v-theme-on-surface, #1f1f1f);
  white-space: pre-wrap;
  word-break: break-word;
  border: 1px solid rgba(0, 0, 0, 0.08);
}

.message-row.from-contact .message-content {
  background: var(--v-theme-surface-variant, #f0f0f0);
}

.message-row.from-agent .message-content {
  background: var(--v-theme-primary, #1976d2);
  color: var(--v-theme-on-primary, #ffffff);
  border-color: transparent;
}

.message-content pre {
  margin: 0;
  white-space: pre-wrap;
  font-family: var(--v-font-family, inherit);
}

.ellipsis {
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
</style>
