<template>
  <v-app-bar elevation="1">
    <template #prepend>
      <v-btn
        icon="mdi-arrow-left"
        variant="text"
        @click="$router.push('/')"
      />
    </template>
    <v-app-bar-title v-if="list && !isRenaming" class="text-h6">{{ list.name }}</v-app-bar-title>
    <v-app-bar-title v-else class="text-h6">列表</v-app-bar-title>
  </v-app-bar>
  <v-container>

    <div class="d-flex align-center mb-4">
      <v-btn
        border
        class="mr-2"
        icon
        to="/list"
      >
        <v-icon>mdi-arrow-left</v-icon>
      </v-btn>
      <h1 v-if="list && !isRenaming">
        {{ list.name }}
        <v-btn border icon size="small" @click="startRenaming">
          <v-icon>mdi-pencil</v-icon>
        </v-btn>
      </h1>
      <div v-else-if="list && isRenaming" class="d-flex align-center">
        <v-text-field
          v-model="newListName"
          autofocus
          class="mr-2"
          density="compact"
          hide-details
          label="列表名称"
          style="min-width: 200px;"
          @keyup.enter="saveListName"
        ></v-text-field>
        <v-btn class="mr-2" color="primary" size="small" @click="saveListName">
          <v-icon>mdi-check</v-icon>
        </v-btn>
        <v-btn color="error" size="small" @click="cancelRenaming">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </div>
      <h1 v-else>
        加载中...
      </h1>
    </div>


    <v-card border class="mb-5" rounded="xl">
      <v-card-title class="d-flex align-center">
        项目列表
        <v-spacer/>
        <v-btn-toggle
          v-model="sortType"
          mandatory
        >
          <v-btn value="default">
            <v-icon>mdi-sort-alphabetical-ascending</v-icon>
          </v-btn>
          <v-btn value="completed">
            <v-icon>mdi-check-circle-outline</v-icon>
          </v-btn>
        </v-btn-toggle>
      </v-card-title>
      <v-card-text v-if="sortedItems.length === 0">
        暂无项目，请添加新项目
      </v-card-text>
      <v-list
        v-else
        select-strategy="leaf"
      >
        <v-list-item
          v-for="(item, index) in sortedItems"
          :key="item.id"
          :class="{ 'text-decoration-line-through': item.completed }"
          @click="openItemDetails(item)"
        >
          <template #prepend>
            <v-list-item-action start>
              <v-checkbox-btn
                :model-value="item.completed"
                @update:model-value="updateItemStatus(item.id, $event)"
                @click.stop
              />
            </v-list-item-action>
          </template>
          {{ item.name }}
          <v-list-item-subtitle>{{ item.description }}</v-list-item-subtitle>
          <template #append>
            {{ index + 1 }}
          </template>
        </v-list-item>
      </v-list>
      <v-card-actions v-if="sortedItems.length > 0">
        <v-spacer/>
        <v-btn
          :disabled="!hasCompletedItems"
          color="error"
          prepend-icon="mdi-delete-sweep"
          @click="confirmDeleteCompleted"
        >
          删除已完成项目
        </v-btn>
      </v-card-actions>
    </v-card>
    <v-card border class="mb-5" rounded="xl">
      <v-card-title>添加新项目</v-card-title>
      <v-card-text>
        <v-text-field
          v-model="newItemName"
          :rules="[(v) => !!v || '名称不能为空']"
          label="项目名称"
        />
        <v-btn
          :disabled="!newItemName"
          color="primary"
          @click="addItem"
        >
          添加
        </v-btn>
      </v-card-text>
    </v-card>

    <v-card border class="mb-5" rounded="xl">
      <v-card-title>列表排序</v-card-title>
      <v-card-text>
        <v-text-field
          v-model="sortSeed"
          class="mb-3"
          hint="输入相同的种子值可以得到相同的排序结果"
          label="排序种子 (任意数字或文本)"
          persistent-hint
        />
        <v-btn
          class="mr-2"
          color="primary"
          @click="randomSort"
        >
          随机排序
        </v-btn>
        <v-btn
          variant="text"
          @click="resetSort"
        >
          撤销
        </v-btn>
      </v-card-text>
    </v-card>

    <!-- 确认删除对话框 -->
    <v-dialog v-model="deleteDialog.show" max-width="500">
      <v-card border rounded="xl">
        <v-card-title>{{ deleteDialog.title }}</v-card-title>
        <v-card-text>{{ deleteDialog.text }}</v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="primary" variant="text" @click="deleteDialog.show = false">
            取消
          </v-btn>
          <v-btn color="error" variant="text" @click="confirmDelete">
            确认删除
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- 项目详情对话框 -->
    <v-dialog v-model="itemDialog.show" max-width="600">
      <v-card border rounded="xl">
        <v-card-title>
          <span v-if="!itemDialog.isEditing">项目详情</span>
          <span v-else>编辑项目</span>
        </v-card-title>

        <v-card-text>
          <div v-if="!itemDialog.isEditing && itemDialog.item">
            <v-list>
              <v-list-item>
                <v-list-item-title class="text-subtitle-1 font-weight-bold">{{ itemDialog.item.name }}
                </v-list-item-title>
                <v-list-item-subtitle>{{ itemDialog.item.id }}</v-list-item-subtitle>
              </v-list-item>

              <v-list-item>
                <v-list-item-title class="text-subtitle-1 font-weight-bold">状态</v-list-item-title>
                <v-list-item-subtitle>
                  <v-chip
                    :color="itemDialog.item.completed ? 'success' : 'warning'"
                    size="small"
                  >
                    {{ itemDialog.item.completed ? '已完成' : '未完成' }}
                  </v-chip>
                </v-list-item-subtitle>
              </v-list-item>

              <v-list-item v-if="itemDialog.item.description">
                <v-list-item-title class="text-subtitle-1 font-weight-bold">描述</v-list-item-title>
                <v-list-item-subtitle>{{ itemDialog.item.description }}</v-list-item-subtitle>
              </v-list-item>

            </v-list>
          </div>

          <div v-else-if="itemDialog.isEditing && itemDialog.item" class="pa-2">
            <v-text-field
              v-model="itemDialog.editedItem.name"
              class="mb-3"
              label="名称"
              variant="outlined"
            ></v-text-field>

            <v-textarea
              v-model="itemDialog.editedItem.description"
              class="mb-3"
              label="描述"
              rows="3"
              variant="outlined"
            ></v-textarea>


            <v-switch
              v-model="itemDialog.editedItem.completed"
              color="success"
              hide-details
              label="已完成"
            ></v-switch>
          </div>
        </v-card-text>

        <v-card-actions>
          <v-spacer></v-spacer>

          <template v-if="!itemDialog.isEditing">
            <v-btn color="primary" variant="text" @click="startEditingItem">
              编辑
            </v-btn>
            <v-btn color="error" variant="text" @click="confirmDeleteItem(itemDialog.item?.id)">
              删除
            </v-btn>
            <v-btn color="secondary" variant="text" @click="itemDialog.show = false">
              关闭
            </v-btn>
          </template>

          <template v-else>
            <v-btn color="success" variant="text" @click="saveItemChanges">
              保存
            </v-btn>
            <v-btn color="secondary" variant="text" @click="cancelEditingItem">
              取消
            </v-btn>
          </template>
        </v-card-actions>
      </v-card>
    </v-dialog>

  </v-container>
</template>

<script>
import dataProvider from "@/utils/dataProvider.js";

export default {
  data() {
    return {
      listId: null,
      list: null,
      items: [],
      originalItems: [], // 保存原始顺序的项目列表
      newItemName: "",
      sortSeed: "1", // 默认排序种子
      sortType: "default", // 默认排序类型
      isRandomSorted: false, // 是否已经随机排序
      deleteDialog: {
        show: false,
        title: "",
        text: "",
        itemId: null,
        action: null
      },
      isRenaming: false,
      newListName: "",
      itemDialog: {
        show: false,
        item: null,
        isEditing: false,
        editedItem: null
      }
    };
  },
  computed: {
    sortedItems() {
      if (this.sortType === "completed") {
        // 按完成状态排序：未完成的在前，完成的在后
        return [...this.items].sort((a, b) => {
          if (a.completed === b.completed) return 0;
          return a.completed ? 1 : -1;
        });
      }
      // 默认返回当前排序（可能是随机排序后的）
      return this.items;
    },
    hasCompletedItems() {
      return this.items.some(item => item.completed);
    }
  },
  async created() {
    this.listId = this.$route.params.id;
    await Promise.all([this.loadListInfo(), this.loadItems()]);
  },
  methods: {
    async loadListInfo() {
      try {
        const listsInfo = await dataProvider.loadData("classworks-list-info");
        if (listsInfo && Array.isArray(listsInfo)) {
          this.list = listsInfo.find((list) => list.id === this.listId);
        }

        if (!this.list) {
          // List not found, redirect back to list page
          this.$router.push("/list");
        }
      } catch (error) {
        console.error("Failed to load list info", error);
        this.$router.push("/list");
      }
    },
    startRenaming() {
      if (this.list) {
        this.newListName = this.list.name;
        this.isRenaming = true;
      }
    },
    cancelRenaming() {
      this.isRenaming = false;
      this.newListName = "";
    },
    async saveListName() {
      if (!this.newListName.trim()) {
        return;
      }

      try {
        // 加载所有列表信息
        const listsInfo = await dataProvider.loadData("classworks-list-info");
        if (listsInfo && Array.isArray(listsInfo)) {
          // 找到当前列表并更新名称
          const listIndex = listsInfo.findIndex((list) => list.id === this.listId);
          if (listIndex !== -1) {
            listsInfo[listIndex].name = this.newListName.trim();
            // 保存更新后的列表信息
            await dataProvider.saveData("classworks-list-info", listsInfo);
            // 更新当前页面的列表信息
            this.list.name = this.newListName.trim();
          }
        }
        // 退出重命名模式
        this.isRenaming = false;
      } catch (error) {
        console.error("Failed to update list name", error);
      }
    },
    async loadItems() {
      try {
        let items = await dataProvider.loadData(
          `classworks-list-${this.listId}`
        );
        if (!items || !Array.isArray(items)) {
          items = [];
          await dataProvider.saveData(`classworks-list-${this.listId}`, items);
        }

        // 确保每个项目都有正确的数据结构
        this.items = items.map(item => {
          // 如果是从学生列表直接复制过来的，可能没有completed属性
          if (typeof item.completed === 'undefined') {
            return {
              id: item.id || Date.now() + Math.floor(Math.random() * 1000),
              name: item.name,
              completed: false,
              description: item.description || '',
            };
          }
          // 确保有描述和备注字段
          return {
            ...item,
            description: item.description || '',
          };
        });

        // 保存原始顺序
        this.originalItems = JSON.parse(JSON.stringify(this.items));
      } catch (error) {
        console.error("Failed to load items", error);
        this.items = [];
        this.originalItems = [];
      }
    },
    async addItem() {
      if (!this.newItemName) return;

      const newItem = {
        id: Date.now().toString(),
        name: this.newItemName,
        completed: false,
        description: '',
      };

      this.items.push(newItem);
      // 同时更新原始列表
      this.originalItems.push(JSON.parse(JSON.stringify(newItem)));

      await this.saveItems();
      this.newItemName = "";
    },
    openItemDetails(item) {
      this.itemDialog = {
        show: true,
        item: item,
        isEditing: false,
        editedItem: null
      };
    },
    startEditingItem() {
      if (!this.itemDialog.item) return;

      this.itemDialog.isEditing = true;
      this.itemDialog.editedItem = JSON.parse(JSON.stringify(this.itemDialog.item));
    },
    cancelEditingItem() {
      this.itemDialog.isEditing = false;
      this.itemDialog.editedItem = null;
    },
    async saveItemChanges() {
      if (!this.itemDialog.editedItem) return;

      const itemIndex = this.items.findIndex(item => item.id === this.itemDialog.item.id);
      if (itemIndex !== -1) {
        // 更新项目
        this.items[itemIndex] = {
          ...this.itemDialog.editedItem
        };

        // 同时更新原始列表
        const originalIndex = this.originalItems.findIndex(item => item.id === this.itemDialog.item.id);
        if (originalIndex !== -1) {
          this.originalItems[originalIndex] = JSON.parse(JSON.stringify(this.items[itemIndex]));
        }

        await this.saveItems();

        // 更新对话框中显示的项目
        this.itemDialog.item = this.items[itemIndex];
        this.itemDialog.isEditing = false;
        this.itemDialog.editedItem = null;
      }
    },
    confirmDeleteItem(itemId) {
      const item = this.items.find(item => item.id === itemId);
      if (item) {
        this.deleteDialog = {
          show: true,
          title: "删除确认",
          text: `确定要删除 "${item.name}" 吗？`,
          itemId: itemId,
          action: 'deleteItem'
        };
        // 如果是从项目详情对话框中删除，则关闭项目详情对话框
        if (this.itemDialog.show && this.itemDialog.item?.id === itemId) {
          this.itemDialog.show = false;
        }
      }
    },
    confirmDeleteCompleted() {
      const completedCount = this.items.filter(item => item.completed).length;
      this.deleteDialog = {
        show: true,
        title: "删除已完成项目",
        text: `确定要删除所有已完成的项目吗？(共 ${completedCount} 项)`,
        action: 'deleteCompleted'
      };
    },
    confirmDelete() {
      if (this.deleteDialog.action === 'deleteItem' && this.deleteDialog.itemId) {
        this.deleteItem(this.deleteDialog.itemId);
      } else if (this.deleteDialog.action === 'deleteCompleted') {
        this.deleteCompletedItems();
      }
      this.deleteDialog.show = false;
    },
    async deleteItem(itemId) {
      this.items = this.items.filter((item) => item.id !== itemId);
      this.originalItems = this.originalItems.filter(
        (item) => item.id !== itemId
      );
      await this.saveItems();
    },
    async deleteCompletedItems() {
      this.items = this.items.filter(item => !item.completed);
      this.originalItems = this.originalItems.filter(item => !item.completed);
      await this.saveItems();
    },
    async updateItemStatus(itemId, newStatus) {
      // 更新项目的完成状态
      const item = this.items.find(item => item.id === itemId);
      if (item) {
        item.completed = newStatus;

        // 同时更新原始列表中对应项目的状态
        const originalItem = this.originalItems.find(item => item.id === itemId);
        if (originalItem) {
          originalItem.completed = newStatus;
        }

        await this.saveItems();
      }
    },
    async saveItems() {
      try {
        await dataProvider.saveData(
          `classworks-list-${this.listId}`,
          this.items
        );
      } catch (error) {
        console.error("Failed to save items", error);
      }
    },
    // 使用种子值进行随机排序
    randomSort() {
      // 对每个元素分配一个基于种子和元素ID的随机值
      const itemsWithRandom = this.items.map((item) => {
        // 为每个项目生成一个唯一但可重现的随机数
        const itemSeed = this.hashCode(item.id + this.sortSeed);
        return {
          ...item,
          randomValue: this.seededRandom(itemSeed),
        };
      });

      // 根据随机值排序
      itemsWithRandom.sort((a, b) => a.randomValue - b.randomValue);

      // 移除临时的randomValue属性并更新items
      this.items = itemsWithRandom.map((item) => {
        const newItem = {...item};
        delete newItem.randomValue;
        return newItem;
      });

      this.isRandomSorted = true;
      this.saveItems(); // 保存排序后的结果
    },
    // 重置为原始顺序
    resetSort() {
      this.items = JSON.parse(JSON.stringify(this.originalItems));
      this.isRandomSorted = false;
      this.saveItems();
    },
    // 字符串转哈希值，用于种子
    hashCode(str) {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash; // Convert to 32bit integer
      }
      return Math.abs(hash); // 确保返回正数
    },
    // 基于种子的伪随机数生成器
    seededRandom(seed) {
      // 使用简单但可重现的伪随机数生成算法
      const x = Math.sin(seed) * 10000;
      return x - Math.floor(x);
    },
  },
};
</script>

<style scoped></style>
