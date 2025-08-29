<template>
  <settings-card title="KV数据库管理" icon="mdi-database-edit" :loading="loading">
    <v-list>
      <!-- 数据库连接状态 -->
      <v-list-item>
        <template #prepend>
          <v-icon :icon="connectionIcon" :color="connectionColor" class="mr-3" />
        </template>
        <v-list-item-title>数据库状态</v-list-item-title>
        <v-list-item-subtitle>{{ connectionStatus }}</v-list-item-subtitle>
        <template #append>
          <v-btn variant="tonal" @click="refreshConnection" :loading="loading">
            刷新
          </v-btn>
        </template>
      </v-list-item>

      <v-divider class="my-2" />

      <!-- 数据列表 -->
      <v-list-item>
        <template #prepend>
          <v-icon icon="mdi-format-list-bulleted" class="mr-3" />
        </template>
        <v-list-item-title>数据条目</v-list-item-title>
        <v-list-item-subtitle>共 {{ kvData.length }} 条记录</v-list-item-subtitle>
        <template #append>
          <v-btn-group variant="tonal">
            <v-btn @click="loadKvData" :loading="loadingData">
              加载数据
            </v-btn>
            <v-btn @click="createNewItem" :disabled="!isKvProvider">
              <v-icon icon="mdi-plus" class="mr-1" />
              新建
            </v-btn>
          </v-btn-group>
        </template>
      </v-list-item>
    </v-list>

    <!-- 数据表格 -->
    <v-card v-if="kvData.length > 0" class="mt-4" variant="outlined">
      <v-card-title class="d-flex align-center">
        <v-icon icon="mdi-table" class="mr-2" />
        KV数据列表
        <v-spacer />
        <v-text-field
          v-model="searchQuery"
          label="搜索键名"
          prepend-inner-icon="mdi-magnify"
          variant="outlined"
          density="compact"
          hide-details
          clearable
          style="max-width: 300px;"
        />
      </v-card-title>

      <v-data-table
        :headers="tableHeaders"
        :items="filteredKvData"
        :loading="loadingData"
        item-value="key"
        class="elevation-0"
        :items-per-page="10"
      >
        <template #[`item.key`]="{ item }">
          <code class="text-primary">{{ item.key }}</code>
        </template>

        <template #[`item.actions`]="{ item }">
          <v-btn-group variant="text" density="compact">
            <v-btn
              icon="mdi-eye"
              size="small"
              @click="viewItem(item)"
              title="查看"
            />
            <v-btn
              icon="mdi-pencil"
              size="small"
              @click="editItem(item)"
              title="编辑"
            />
            <v-btn
              icon="mdi-delete"
              size="small"
              color="error"
              @click="confirmDelete(item)"
              title="删除"
            />
          </v-btn-group>
        </template>
      </v-data-table>
    </v-card>

    <!-- 查看数据对话框 -->
    <v-dialog v-model="viewDialog" max-width="800px">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon icon="mdi-eye" class="mr-2" />
          查看数据
          <v-spacer />
          <v-btn icon="mdi-close" variant="text" @click="viewDialog = false" />
        </v-card-title>

        <v-card-subtitle v-if="selectedItem">
          键名: <code>{{ selectedItem.key }}</code>
        </v-card-subtitle>

        <v-card-text>
          <v-textarea
            v-if="selectedItem"
            :model-value="formatJsonData(selectedItem.value)"
            label="数据内容"
            variant="outlined"
            readonly
            rows="15"
            class="font-monospace"
          />
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn @click="copyToClipboard(selectedItem?.value)" variant="tonal">
            <v-icon icon="mdi-content-copy" class="mr-1" />
            复制数据
          </v-btn>
          <v-btn @click="viewDialog = false" variant="text">
            关闭
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- 编辑数据对话框 -->
    <v-dialog v-model="editDialog" max-width="800px">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon icon="mdi-pencil" class="mr-2" />
          编辑数据
          <v-spacer />
          <v-btn icon="mdi-close" variant="text" @click="closeEditDialog" />
        </v-card-title>

        <v-card-subtitle v-if="editingItem">
          键名: <code>{{ editingItem.key }}</code>
        </v-card-subtitle>

        <v-card-text>
          <v-textarea
            v-model="editingData"
            label="数据内容 (JSON格式)"
            variant="outlined"
            rows="15"
            class="font-monospace"
            :error="!isValidJson"
            :error-messages="isValidJson ? [] : ['请输入有效的JSON格式']"
          />
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn @click="closeEditDialog" variant="text">
            取消
          </v-btn>
          <v-btn
            @click="saveEditedData"
            variant="tonal"
            color="primary"
            :disabled="!isValidJson"
            :loading="savingData"
          >
            保存
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- 新建数据对话框 -->
    <v-dialog v-model="createDialog" max-width="800px">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon icon="mdi-plus" class="mr-2" />
          新建数据
          <v-spacer />
          <v-btn icon="mdi-close" variant="text" @click="closeCreateDialog" />
        </v-card-title>

        <v-card-text>
          <v-text-field
            v-model="newKey"
            label="键名"
            variant="outlined"
            class="mb-4"
            :error="!isValidKey"
            :error-messages="isValidKey ? [] : ['键名不能为空且不能与现有键重复']"
            placeholder="请输入键名，如：my-config"
          />

          <v-textarea
            v-model="newData"
            label="数据内容 (JSON格式)"
            variant="outlined"
            rows="15"
            class="font-monospace"
            :error="!isValidNewJson"
            :error-messages="isValidNewJson ? [] : ['请输入有效的JSON格式']"
            placeholder='请输入JSON数据，如：{"name": "value"}'
          />
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn @click="closeCreateDialog" variant="text">
            取消
          </v-btn>
          <v-btn
            @click="saveNewData"
            variant="tonal"
            color="primary"
            :disabled="!isValidKey || !isValidNewJson"
            :loading="savingData"
          >
            创建
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- 删除确认对话框 -->
    <v-dialog v-model="deleteDialog" max-width="400px">
      <v-card>
        <v-card-title class="d-flex align-center text-error">
          <v-icon icon="mdi-alert" class="mr-2" />
          确认删除
        </v-card-title>

        <v-card-text>
          确定要删除键名为 <code>{{ itemToDelete?.key }}</code> 的数据吗？
          <br><br>
          <v-alert type="warning" variant="tonal" class="mt-2">
            此操作不可撤销，请谨慎操作！
          </v-alert>
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn @click="deleteDialog = false" variant="text">
            取消
          </v-btn>
          <v-btn
            @click="deleteItem"
            variant="tonal"
            color="error"
            :loading="deletingData"
          >
            删除
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </settings-card>
</template>

<script>
import SettingsCard from '@/components/SettingsCard.vue';
import dataProvider from '@/utils/dataProvider';
import { getSetting } from '@/utils/settings';
import { openDB } from 'idb';

export default {
  name: 'KvDatabaseCard',
  components: {
    SettingsCard
  },

  data() {
    return {
      loading: false,
      loadingData: false,
      savingData: false,
      deletingData: false,
      kvData: [],
      searchQuery: '',

      // 对话框状态
      viewDialog: false,
      editDialog: false,
      deleteDialog: false,
      createDialog: false,

      // 选中的项目
      selectedItem: null,
      editingItem: null,
      itemToDelete: null,

      // 编辑数据
      editingData: '',
      newKey: '',
      newData: '',

      // 表格头部
      tableHeaders: [
        { title: '键名', key: 'key', sortable: true },
        { title: '操作', key: 'actions', sortable: false, width: '120px' }
      ]
    };
  },

  computed: {
    currentProvider() {
      return getSetting('server.provider');
    },

    isKvProvider() {
      return this.currentProvider === 'kv-local' || this.currentProvider === 'kv-server'||this.currentProvider === 'classworkscloud'
    },

    connectionStatus() {
      if (!this.isKvProvider) {
        return '当前数据提供者不支持KV数据库管理';
      }
      return this.currentProvider === 'kv-local' ? '本地数据库' : '服务器数据库';
    },

    connectionIcon() {
      if (!this.isKvProvider) return 'mdi-database-off';
      return this.currentProvider === 'kv-local' ? 'mdi-database' : 'mdi-database-sync';
    },

    connectionColor() {
      if (!this.isKvProvider) return 'error';
      return 'success';
    },

    filteredKvData() {
      if (!this.searchQuery) return this.kvData;
      return this.kvData.filter(item =>
        item.key.toLowerCase().includes(this.searchQuery.toLowerCase())
      );
    },

    isValidJson() {
      if (!this.editingData) return true;
      try {
        JSON.parse(this.editingData);
        return true;
      } catch {
        return false;
      }
    },

    isValidNewJson() {
      if (!this.newData) return true;
      try {
        JSON.parse(this.newData);
        return true;
      } catch {
        return false;
      }
    },

    isValidKey() {
      if (!this.newKey || this.newKey.trim() === '') return false;
      // 检查是否与现有键重复
      return !this.kvData.some(item => item.key === this.newKey.trim());
    }
  },

  async mounted() {
    if (this.isKvProvider) {
      await this.loadKvData();
    }
  },

  methods: {
    async refreshConnection() {
      this.loading = true;
      try {
        // 重新检查连接状态
        await new Promise(resolve => setTimeout(resolve, 500));
        this.$message.success('连接状态已刷新');
      } catch (error) {
        this.$message.error('刷新失败', error.message);
      } finally {
        this.loading = false;
      }
    },

    async loadKvData() {
      if (!this.isKvProvider) {
        this.$message.warning('当前数据提供者不支持KV数据库管理');
        return;
      }

      this.loadingData = true;
      try {
        this.kvData = [];

        // 使用新的loadKeys API获取键名列表
        const result = await dataProvider.loadKeys({
          sortBy: 'key',
          sortDir: 'asc',
          limit: 1000 // 获取更多数据，可根据需要调整
        });

        if (result.success === false) {
          throw new Error(result.error?.message || '获取键名列表失败');
        }

        // 只保存键名，不读取内容
        this.kvData = result.keys.map(key => ({
          key,
          value: null, // 不预加载内容
          loaded: false // 标记是否已加载内容
        }));

        this.$message.success('键名加载完成', `共找到 ${this.kvData.length} 个键，总计 ${result.total_rows} 个键`);
      } catch (error) {
        this.$message.error('加载数据失败', error.message);
      } finally {
        this.loadingData = false;
      }
    },







    async viewItem(item) {
      this.selectedItem = item;
      this.viewDialog = true;
      
      // 如果数据未加载，则加载数据
      if (!item.loaded || item.value === null) {
        await this.loadItemData(item);
      }
    },

    async editItem(item) {
      this.editingItem = item;
      
      // 如果数据未加载，则加载数据
      if (!item.loaded || item.value === null) {
        await this.loadItemData(item);
      }
      
      this.editingData = this.formatJsonData(item.value);
      this.editDialog = true;
    },

    async loadItemData(item) {
      try {
        const data = await dataProvider.loadData(item.key);
        if (data && data.success !== false) {
          item.value = data;
          item.loaded = true;
        } else {
          throw new Error('数据加载失败');
        }
      } catch (error) {
        this.$message.error('加载数据失败', error.message);
        item.value = null;
        item.loaded = false;
      }
    },

    closeEditDialog() {
      this.editDialog = false;
      this.editingItem = null;
      this.editingData = '';
    },

    createNewItem() {
      this.newKey = '';
      this.newData = '{\n  "example": "value"\n}';
      this.createDialog = true;
    },

    closeCreateDialog() {
      this.createDialog = false;
      this.newKey = '';
      this.newData = '';
    },

    async saveNewData() {
      if (!this.isValidKey || !this.isValidNewJson) return;

      this.savingData = true;
      try {
        const parsedData = JSON.parse(this.newData);
        const key = this.newKey.trim();
        const result = await dataProvider.saveData(key, parsedData);

        if (result && !result.error) {
          // 添加到本地数据列表
          this.kvData.push({
            key,
            value: parsedData,
            loaded: true
          });

          this.$message.success('数据创建成功');
          this.closeCreateDialog();
        } else {
          throw new Error(result.error?.message || '创建失败');
        }
      } catch (error) {
        this.$message.error('创建失败', error.message);
      } finally {
        this.savingData = false;
      }
    },

    async saveEditedData() {
      if (!this.isValidJson || !this.editingItem) return;

      this.savingData = true;
      try {
        const parsedData = JSON.parse(this.editingData);
        const result = await dataProvider.saveData(this.editingItem.key, parsedData);

        if (result && !result.error) {
          // 更新本地数据
          const index = this.kvData.findIndex(item => item.key === this.editingItem.key);
          if (index !== -1) {
            this.kvData[index].value = parsedData;
            this.kvData[index].loaded = true;
          }

          this.$message.success('数据保存成功');
          this.closeEditDialog();
        } else {
          throw new Error(result.error?.message || '保存失败');
        }
      } catch (error) {
        this.$message.error('保存失败', error.message);
      } finally {
        this.savingData = false;
      }
    },

    confirmDelete(item) {
      this.itemToDelete = item;
      this.deleteDialog = true;
    },

    async deleteItem() {
      if (!this.itemToDelete) return;

      this.deletingData = true;
      try {
        // 对于本地存储，直接删除
        if (this.currentProvider === 'kv-local') {
          const db = await openDB('ClassworksDB', 2);
          const tx = db.transaction('kv', 'readwrite');
          const store = tx.objectStore('kv');
          await store.delete(this.itemToDelete.key);
        } else {
          // 对于服务器存储，这里需要实现删除API
          // 注意：大多数KV服务器不提供删除功能，可能需要设置为null
          await dataProvider.saveData(this.itemToDelete.key, null);
        }

        // 从本地列表中移除
        const index = this.kvData.findIndex(item => item.key === this.itemToDelete.key);
        if (index !== -1) {
          this.kvData.splice(index, 1);
        }

        this.$message.success('数据删除成功');
        this.deleteDialog = false;
        this.itemToDelete = null;
      } catch (error) {
        this.$message.error('删除失败', error.message);
      } finally {
        this.deletingData = false;
      }
    },

    formatJsonData(data) {
      try {
        return JSON.stringify(data, null, 2);
      } catch {
        return String(data);
      }
    },

    async copyToClipboard(data) {
      try {
        const text = this.formatJsonData(data);
        await navigator.clipboard.writeText(text);
        this.$message.success('数据已复制到剪贴板');
      } catch (error) {
        this.$message.error('复制失败', error.message);
      }
    }
  }
};
</script>

<style scoped>
.font-monospace {
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
}

code {
  background-color: rgba(0, 0, 0, 0.05);
  padding: 2px 4px;
  border-radius: 4px;
  font-size: 0.875em;
}
</style>
