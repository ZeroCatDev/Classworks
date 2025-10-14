<template>
  <v-app-bar elevation="1">
    <template #prepend>
      <v-btn
        icon="mdi-arrow-left"
        variant="text"
        @click="$router.push('/')"
      />
    </template>
    <v-app-bar-title class="text-h6">
      列表
    </v-app-bar-title>
  </v-app-bar><v-container>
    <v-card
      border
      class="mb-5"
      rounded="xl"
    >
      <v-card-title>现有列表</v-card-title>
      <v-card-text v-if="lists.length === 0">
        暂无列表，请创建新列表
      </v-card-text>
      <v-list v-else>
        <v-list-item
          v-for="list in lists"
          :key="list.id"
          :to="list.id !== editingListId ? `/list/${list.id}` : undefined"
          :active="list.id === editingListId"
        >
          <div v-if="list.id !== editingListId">
            <v-list-item-title>{{ list.name }}</v-list-item-title>
          </div>
          <div
            v-else
            class="d-flex align-center w-100"
          >
            <v-text-field
              v-model="editListName"
              label="列表名称"
              hide-details
              density="compact"
              class="mr-2"
              autofocus
              @keyup.enter="saveListName"
            />
            <v-btn
              icon
              color="primary"
              class="mr-2"
              border
              @click.stop.prevent="saveListName"
            >
              <v-icon>mdi-check</v-icon>
            </v-btn>
            <v-btn
              icon
              color="error"
              border
              @click.stop.prevent="cancelEditing"
            >
              <v-icon>mdi-close</v-icon>
            </v-btn>
          </div>

          <template #append>
            <div v-if="list.id !== editingListId">
              <v-btn
                icon
                class="mr-2"
                border
                @click.stop.prevent="startEditing(list.id)"
              >
                <v-icon>mdi-pencil</v-icon>
              </v-btn>
              <v-btn
                icon
                border
                @click.stop.prevent="confirmDeleteList(list.id)"
              >
                <v-icon>mdi-delete</v-icon>
              </v-btn>
            </div>
          </template>
        </v-list-item>
      </v-list>
    </v-card>
    <v-card
      class="mb-5"
      border
      rounded="xl"
    >
      <v-card-title>创建新列表</v-card-title>
      <v-card-text>
        <v-text-field
          v-model="newListName"
          label="列表名称"
          :rules="[v => !!v || '名称不能为空']"
        />
        <v-btn
          color="primary"
          :disabled="!newListName"
          @click="createNewList"
        >
          创建列表
        </v-btn>
      </v-card-text>
    </v-card>
    <!-- 确认删除对话框 -->
    <v-dialog
      v-model="deleteDialog.show"
      max-width="500"
    >
      <v-card border>
        <v-card-title>删除列表</v-card-title>
        <v-card-text>{{ deleteDialog.text }}</v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn
            color="primary"
            variant="text"
            @click="deleteDialog.show = false"
          >
            取消
          </v-btn>
          <v-btn
            color="error"
            variant="text"
            @click="confirmDelete"
          >
            确认删除
          </v-btn>
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
      lists: [],
      newListName: "",
      studentList: [], // 存储学生列表数据
      deleteDialog: {
        show: false,
        text: "",
        listId: null
      },
      editingListId: null,
      editListName: ""
    };
  },
  async created() {
    await Promise.all([
      this.loadLists(),
      this.loadStudentList()
    ]);
  },
  methods: {
    async loadLists() {
      try {
        let listsInfo = await dataProvider.loadData("classworks-list-info");
        if (!listsInfo || !Array.isArray(listsInfo)) {
          listsInfo = [];
          await dataProvider.saveData("classworks-list-info", listsInfo);
        }
        this.lists = listsInfo;
      } catch (error) {
        console.error("Failed to load lists", error);
        this.lists = [];
        await dataProvider.saveData("classworks-list-info", []);
      }
    },

    async loadStudentList() {
      try {
        // 从classworks-list-main加载学生列表数据
        const response = await dataProvider.loadData("classworks-list-main");
        if (response && Array.isArray(response)) {
          this.studentList = response;
        } else {
          this.studentList = [];
        }
      } catch (error) {
        console.error("Failed to load student list", error);
        this.studentList = [];
      }
    },

    async createNewList() {
      if (!this.newListName) return;

      const listId = Date.now().toString();
      const newList = {
        id: listId,
        name: this.newListName,
      };

      // Add to lists info
      this.lists.push(newList);
      await dataProvider.saveData("classworks-list-info", this.lists);

      // 创建列表数据，确保正确的数据结构
      const newListData = [];

      // 如果有学生列表数据，则填充
      if (this.studentList && this.studentList.length > 0) {
        this.studentList.forEach(student => {
          newListData.push({
            id: student.id || Date.now() + Math.floor(Math.random() * 1000),
            name: student.name,
            completed: false,
          });
        });
      }

      await dataProvider.saveData(`classworks-list-${listId}`, newListData);

      this.newListName = "";

      // Navigate to the new list
      this.$router.push(`/list/${listId}`);
    },

    startEditing(listId) {
      const list = this.lists.find(list => list.id === listId);
      if (list) {
        this.editingListId = listId;
        this.editListName = list.name;
      }
    },

    cancelEditing() {
      this.editingListId = null;
      this.editListName = "";
    },

    async saveListName() {
      if (!this.editListName.trim() || !this.editingListId) {
        return;
      }

      try {
        // 找到当前编辑的列表并更新名称
        const listIndex = this.lists.findIndex(list => list.id === this.editingListId);
        if (listIndex !== -1) {
          this.lists[listIndex].name = this.editListName.trim();
          // 保存更新后的列表信息
          await dataProvider.saveData("classworks-list-info", this.lists);
        }
        // 退出编辑模式
        this.editingListId = null;
        this.editListName = "";
      } catch (error) {
        console.error("Failed to update list name", error);
      }
    },

    confirmDeleteList(listId) {
      const list = this.lists.find(list => list.id === listId);
      if (list) {
        this.deleteDialog = {
          show: true,
          text: `确定要删除列表 "${list.name}" 吗？`,
          listId: listId
        };
      }
    },

    confirmDelete() {
      if (this.deleteDialog.listId) {
        this.deleteList(this.deleteDialog.listId);
      }
      this.deleteDialog.show = false;
    },

    async deleteList(listId) {
      this.lists = this.lists.filter(list => list.id !== listId);
      await dataProvider.saveData("classworks-list-info", this.lists);
      // We don't need to delete the actual list data as it will just remain unused
    }
  }
};
</script>

<style scoped></style>
