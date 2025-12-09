<script setup>
import Sidebar from './components/Sidebar/index.vue'
</script>

<template>
  <div class="common-layout">
    <el-container>
      <sidebar />
      <el-container>
        <!-- <el-header>Header</el-header> -->
        <el-main><router-view></router-view></el-main>
      </el-container>
    </el-container>
  </div>
</template>

<style lang="scss" scoped>
.common-layout {
  height: 100%;
}
</style>
