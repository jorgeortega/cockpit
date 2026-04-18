<script setup lang="ts">
import { ref } from 'vue';
import { beforeStartChecklist } from '../data/checklist';

const emit = defineEmits(['focus-item']);
const completedItems = ref<Set<string>>(new Set());

const toggleItem = (id: string) => {
  if (completedItems.value.has(id)) {
    completedItems.value.delete(id);
  } else {
    completedItems.value.add(id);
  }
  emit('focus-item', id); // Focus on this item
};
</script>

<template>
  <div class="checklist-overlay">
    <div class="checklist-card">
      <h3>Before Start Checklist</h3>
      <div class="checklist-items">
        <div 
          v-for="item in beforeStartChecklist" 
          :key="item.id"
          class="checklist-item"
          :class="{ completed: completedItems.has(item.id) }"
          @click="toggleItem(item.id)"
        >
          <div class="checkbox">
            <span v-if="completedItems.has(item.id)">✓</span>
          </div>
          <div class="content">
            <span class="label">{{ item.item }}</span>
            <span class="dots">.....................</span>
            <span class="action">{{ item.action }}</span>
          </div>
        </div>
      </div>
      <div class="progress">
        {{ completedItems.size }} / {{ beforeStartChecklist.length }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.checklist-overlay {
  padding: 20px;
  width: 100%;
  box-sizing: border-box;
}

.checklist-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 20px;
  color: #fff;
  width: 100%;
  box-sizing: border-box;
}

h3 {
  margin: 0 0 16px 0;
  font-size: 14px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: #aaa;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding-bottom: 8px;
}

.checklist-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.checklist-item {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: background 0.2s;
}

.checklist-item:hover {
  background: rgba(255, 255, 255, 0.05);
}

.checkbox {
  width: 18px;
  height: 18px;
  border: 1px solid #666;
  border-radius: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: #4CAF50;
  flex-shrink: 0;
}

.completed .checkbox {
  border-color: #4CAF50;
}

.content {
  display: flex;
  justify-content: space-between;
  width: 100%;
  font-family: 'Courier New', Courier, monospace;
  font-size: 13px;
  overflow: hidden;
}

.label {
  white-space: nowrap;
}

.dots {
  color: #444;
  overflow: hidden;
  margin: 0 4px;
}

.action {
  color: #ff9800;
  font-weight: bold;
  white-space: nowrap;
}

.completed .label {
  color: #666;
  text-decoration: line-through;
}

.progress {
  margin-top: 16px;
  font-size: 12px;
  text-align: right;
  color: #888;
}
</style>
