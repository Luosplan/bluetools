<script setup>
import Sidebar from './components/SideBar.vue'
</script>

<template>
  <div class="common-layout">
    <el-container class="full-height">
      <Sidebar />
      <el-main class="main-content"><router-view></router-view></el-main>
    </el-container>
  </div>
</template>

<style lang="scss" scoped>
.common-layout {
  height: 100%;
  width: 100%;
  overflow: hidden;
}

.full-height {
  height: 100%;
}

.content-container {
  height: 100%;
  background-color: #0f172a;
}

.main-content {
  padding: 0;
  background-color: #0f172a;
  overflow-y: auto;
}
</style>
