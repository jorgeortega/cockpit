<script setup lang="ts">
/**
 * CS Note: Modal Encapsulation
 * 
 * Modals often contain complex UI and state. By moving the modal to its 
 * own component, we keep the parent "clean" and focused on the cockpit 
 * rendering logic.
 */
import { type ChecklistItem } from '../data/checklist';

defineProps<{
  item: ChecklistItem | null;
}>();

defineEmits<{
  (e: 'close'): void;
}>();
</script>

<template>
  <Transition name="fade">
    <div
      v-if="item"
      class="modal-overlay"
      @click="$emit('close')"
    >
      <div
        class="modal-card"
        @click.stop
      >
        <button
          class="close-btn"
          @click="$emit('close')"
        >
          ×
        </button>
        <div class="panel-tag">
          {{ item.panel.toUpperCase() }}
        </div>
        <h2>{{ item.item }}</h2>
        <div class="action-required">
          Action: <span>{{ item.action }}</span>
        </div>
        <p>{{ item.description }}</p>
        <div class="modal-footer">
          <button
            class="btn-primary"
            @click="$emit('close')"
          >
            GOT IT
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 200;
  backdrop-filter: blur(4px);
}

.modal-card {
  background: #1a1e23;
  width: min(400px, calc(100vw - 32px));
  padding: 30px;
  border-radius: 12px;
  position: relative;
  border: 1px solid #444;
  color: #ddd;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
}

.close-btn {
  position: absolute;
  top: 15px;
  right: 15px;
  background: none;
  border: none;
  color: #888;
  font-size: 24px;
  cursor: pointer;
}

.panel-tag {
  background: #333;
  color: #aaa;
  display: inline-block;
  padding: 2px 8px;
  font-size: 10px;
  border-radius: 4px;
  margin-bottom: 10px;
  letter-spacing: 1px;
}

h2 {
  margin: 0 0 10px 0;
  color: #fff;
  font-size: 22px;
}

.action-required {
  color: #ff9800;
  font-weight: bold;
  margin-bottom: 20px;
  font-size: 16px;
}

.action-required span {
  color: #fff;
  background: rgba(255, 152, 0, 0.1);
  border: 1px solid #ff9800;
  padding: 4px 12px;
  border-radius: 4px;
  margin-left: 8px;
}

p {
  line-height: 1.6;
  font-size: 15px;
  color: #bbb;
}

.modal-footer {
  margin-top: 25px;
  display: flex;
  justify-content: flex-end;
}

.btn-primary {
  background: #ff9800;
  color: #000;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  font-weight: bold;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-primary:hover {
  background: #f57c00;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
