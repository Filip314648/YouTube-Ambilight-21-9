document.addEventListener("DOMContentLoaded", () => {
  const toggle = document.getElementById("toggle");
  const blur = document.getElementById("blur");
  const brightness = document.getElementById("brightness");
  const mode = document.getElementById("mode");

  // Load stored settings
  chrome.storage.sync.get("settings").then(result => {
    const s = result.settings || { blur: 80, brightness: 1.2, enabled: true, mode: "soft" };
    toggle.checked = s.enabled;
    blur.value = s.blur;
    brightness.value = s.brightness;
    mode.value = s.mode;
  });

  const saveAndSend = () => {
    const newSettings = {
      enabled: toggle.checked,
      blur: parseInt(blur.value),
      brightness: parseFloat(brightness.value),
      mode: mode.value
    };
    chrome.storage.sync.set({ settings: newSettings });
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { type: "updateSettings", payload: newSettings });
      }
    });
  };

  toggle.addEventListener("change", saveAndSend);
  blur.addEventListener("input", saveAndSend);
  brightness.addEventListener("input", saveAndSend);
  mode.addEventListener("change", saveAndSend);
});