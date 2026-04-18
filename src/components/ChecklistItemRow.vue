<script setup lang="ts">
/**
 * ChecklistItemRow — one row of the checklist panel.
 *
 * Presentational component. Given a `ChecklistItem` and a `completed` flag,
 * it renders the airline QRH (Quick Reference Handbook) style row
 *   `label .......... ACTION`
 * and emits on click. The parent decides what a click means (mark done,
 * focus the cockpit, both).
 *
 * Accessibility: the row is exposed as a checkbox (role="checkbox" +
 * aria-checked) so assistive tech announces the complete/incomplete state.
 */
import { computed } from 'vue';
import { expandAcronyms, type ChecklistItem } from '../data/checklist';

const props = defineProps<{
  item: ChecklistItem;
  completed: boolean;
}>();

const emit = defineEmits<{
  (e: 'toggle', id: string): void;
  (e: 'focus', id: string): void;
}>();

// Pre-compute the segmented label + action. Each segment is either plain
// text or an acronym with its expansion (rendered as `<abbr title="...">`).
// Doing the split here means the template stays a simple `v-for` instead of
// reaching for `v-html` (which would require sanitising the label).
const labelSegments = computed(() => expandAcronyms(props.item.item));
const actionSegments = computed(() => expandAcronyms(props.item.action));

// One click, two intents: mark the item and tell the cockpit to pan. Emitting
// both events lets the parent route each to its own state.
const handleClick = (id: string) => {
  emit('toggle', id);
  emit('focus', id);
};
</script>

<template>
  <div
    class="checklist-item"
    :class="{ completed }"
    role="checkbox"
    :aria-checked="completed ? 'true' : 'false'"
    @click="handleClick(item.id)"
  >
    <div class="checkbox">
      <span v-if="completed">✓</span>
    </div>
    <div class="content">
      <span class="label">
        <template
          v-for="(seg, i) in labelSegments"
          :key="i"
        >
          <abbr
            v-if="seg.title"
            :title="seg.title"
          >{{ seg.text }}</abbr>
          <template v-else>{{ seg.text }}</template>
        </template>
      </span>
      <span class="dots">.....................</span>
      <span class="action">
        <template
          v-for="(seg, i) in actionSegments"
          :key="i"
        >
          <abbr
            v-if="seg.title"
            :title="seg.title"
          >{{ seg.text }}</abbr>
          <template v-else>{{ seg.text }}</template>
        </template>
      </span>
    </div>
  </div>
</template>

<style scoped>
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

/* `<abbr>` shows a dotted underline by default, which is the visual affordance
 * that tells the reader a tooltip exists on hover. */
abbr {
  cursor: help;
  text-decoration-style: dotted;
  text-decoration-line: underline;
  text-underline-offset: 2px;
}
</style>
