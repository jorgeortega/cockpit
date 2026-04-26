import { mount } from "@vue/test-utils";
import { describe, it, expect } from "vitest";
import { nextTick } from "vue";
import CockpitView from "./CockpitView.vue";

const loadImage = async (
  wrapper: ReturnType<typeof mount>,
  naturalWidth: number,
  naturalHeight: number,
) => {
  const img = wrapper.find(".cockpit-img").element as HTMLImageElement;
  Object.defineProperty(img, "naturalWidth", {
    value: naturalWidth,
    configurable: true,
  });
  Object.defineProperty(img, "naturalHeight", {
    value: naturalHeight,
    configurable: true,
  });
  img.dispatchEvent(new Event("load"));
  await nextTick();
};

describe("CockpitView mobile zoom", () => {
  it("uses 150% increments and supports 2000% zoom when isMobile is true", async () => {
    const wrapper = mount(CockpitView, {
      props: { 
        activePhaseId: "cockpit-prep", 
        focusedItemId: null,
        isMobile: true 
      },
      attachTo: document.body,
    });

    await loadImage(wrapper, 4000, 2000);

    // Initial zoom 100%
    expect(wrapper.find(".zoom-status").text()).toBe("100%");

    // First click should go to 250% (increment is 150% on mobile)
    await wrapper.find('[aria-label="Zoom in"]').trigger("click");
    await nextTick();
    expect(wrapper.find(".zoom-status").text()).toBe("250%");

    // Land on 1000% exactly (6 clicks total: 1 + 6*1.5 = 10)
    for (let i = 0; i < 5; i++) {
        await wrapper.find('[aria-label="Zoom in"]').trigger("click");
        await nextTick();
    }
    expect(wrapper.find(".zoom-status").text()).toBe("1000%");

    // Should be able to go up to 2000%
    while (wrapper.find('[aria-label="Zoom in"]').attributes("disabled") === undefined) {
        await wrapper.find('[aria-label="Zoom in"]').trigger("click");
        await nextTick();
    }
    expect(wrapper.find(".zoom-status").text()).toBe("2000%");
    
    wrapper.unmount();
  });

  it("uses 50% increments and supports 500% zoom when isMobile is false", async () => {
    const wrapper = mount(CockpitView, {
      props: { 
        activePhaseId: "cockpit-prep", 
        focusedItemId: null,
        isMobile: false 
      },
      attachTo: document.body,
    });

    await loadImage(wrapper, 4000, 2000);

    // Initial zoom 100%
    expect(wrapper.find(".zoom-status").text()).toBe("100%");

    // First click should go to 150% (increment is 50% on desktop)
    await wrapper.find('[aria-label="Zoom in"]').trigger("click");
    await nextTick();
    expect(wrapper.find(".zoom-status").text()).toBe("150%");

    // Should be able to go up to 500%
    for (let i = 0; i < 7; i++) {
        await wrapper.find('[aria-label="Zoom in"]').trigger("click");
        await nextTick();
    }
    expect(wrapper.find(".zoom-status").text()).toBe("500%");
    
    // Zoom in button should be disabled at 500%
    expect(wrapper.find('[aria-label="Zoom in"]').attributes("disabled")).toBeDefined();

    wrapper.unmount();
  });
});
