function initCustomZoom() {
  const nativeSelect = document.getElementById('scaleSelect');
  const scaleSelectContainer = document.getElementById('scaleSelectContainer');
  if (!nativeSelect || !scaleSelectContainer) return;

  if (document.getElementById('customZoomBtn')) return; // already init

  // 1. Create custom button
  const customZoomBtn = document.createElement('button');
  customZoomBtn.id = 'customZoomBtn';
  customZoomBtn.className = 'toolbarButton';
  customZoomBtn.title = 'Zoom Options';
  customZoomBtn.innerHTML = '<span class="customZoomBtnText">AZ</span>';

  // 2. Insert into toolbarViewerMiddle
  scaleSelectContainer.parentNode.insertBefore(customZoomBtn, scaleSelectContainer.nextSibling);

  // 3. Create custom menu
  const customZoomMenu = document.createElement('div');
  customZoomMenu.id = 'customZoomMenu';
  customZoomMenu.className = 'doorHanger';
  customZoomMenu.style.display = 'none';

  function positionMenu() {
    const btnCenterY = customZoomBtn.offsetTop + (customZoomBtn.offsetHeight / 2);
    customZoomMenu.style.top = `${btnCenterY}px`;
  }

  // Populate options
  const options = Array.from(nativeSelect.options);
  options.forEach(opt => {
    if (opt.value === 'custom') return; // Hide internal custom option

    const item = document.createElement('div');
    item.className = 'customZoomMenuItem';
    item.dataset.value = opt.value;
    item.textContent = opt.textContent.trim();
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      nativeSelect.value = opt.value;
      nativeSelect.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
      customZoomMenu.style.display = 'none';
      updateBtn();
    });
    customZoomMenu.appendChild(item);
  });

  scaleSelectContainer.parentNode.insertBefore(customZoomMenu, customZoomBtn.nextSibling);

  // Toggle menu
  customZoomBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isHidden = customZoomMenu.style.display === 'none';
    if (isHidden) {
      positionMenu();
      syncMenuSelection();
      customZoomMenu.style.display = 'flex';
    } else {
      customZoomMenu.style.display = 'none';
    }
  });

  // Close when clicking outside
  document.addEventListener('click', (e) => {
    if (!customZoomBtn.contains(e.target) && !customZoomMenu.contains(e.target)) {
      customZoomMenu.style.display = 'none';
    }
  });

  // Sync button text
  const abbreviations = {
    'auto': 'AZ',
    'page-actual': 'AS',
    'page-fit': 'PF',
    'page-width': 'PW'
  };

  function syncMenuSelection() {
    const selectedOpt = nativeSelect.options[nativeSelect.selectedIndex];
    const val = selectedOpt ? selectedOpt.value : nativeSelect.value;
    const items = customZoomMenu.querySelectorAll('.customZoomMenuItem');
    items.forEach(item => {
      if (item.dataset.value === val) {
        item.classList.add('selected');
      } else {
        item.classList.remove('selected');
      }
    });
  }

  function updateBtn() {
    const val = nativeSelect.value;
    let displayText = '';

    if (abbreviations[val]) {
      displayText = abbreviations[val];
    } else {
      // Dynamically extract the exact percentage string from the selected option (fixes NaN%)
      const selectedOption = nativeSelect.options[nativeSelect.selectedIndex];
      displayText = selectedOption ? selectedOption.textContent.trim() : '';
    }

    const span = customZoomBtn.querySelector('.customZoomBtnText');
    if (span && span.textContent !== displayText) {
      span.textContent = displayText;
    }

    syncMenuSelection();
  }

  // Blazing fast polling with DOM check to prevent repaints
  setInterval(updateBtn, 50);

  // Listen to PDF.js specific events for instant sync
  window.addEventListener('scalechanging', updateBtn);
  window.addEventListener('scalechanged', updateBtn);
  window.addEventListener('resize', () => {
    updateBtn();
    positionMenu();
  });

  // --- THEME TOGGLE LOGIC ---
  const secondaryToolbar = document.getElementById('secondaryToolbarButtonContainer');
  if (secondaryToolbar && !document.getElementById('customDarkThemeBtn')) {
    const darkBtn = document.createElement('button');
    darkBtn.id = 'customDarkThemeBtn';
    darkBtn.className = 'toolbarButton labeled';
    darkBtn.type = 'button';
    darkBtn.title = 'Switch to Dark Theme';
    darkBtn.innerHTML = '<span>Dark Theme</span>';

    const lightBtn = document.createElement('button');
    lightBtn.id = 'customLightThemeBtn';
    lightBtn.className = 'toolbarButton labeled';
    lightBtn.type = 'button';
    lightBtn.title = 'Switch to White Theme';
    lightBtn.innerHTML = '<span>White Theme</span>';

    const themeSeparator = document.createElement('div');
    themeSeparator.className = 'horizontalToolbarSeparator';

    // Insert at the top of the Tools menu
    secondaryToolbar.insertBefore(themeSeparator, secondaryToolbar.firstChild);
    secondaryToolbar.insertBefore(lightBtn, secondaryToolbar.firstChild);
    secondaryToolbar.insertBefore(darkBtn, secondaryToolbar.firstChild);

    const storageArea = (typeof chrome !== 'undefined' && chrome.storage) ? (chrome.storage.sync || chrome.storage.local) : null;

    function applyThemeClasses(value) {
      if (value === 2) {
        document.documentElement.classList.remove('is-light');
        document.documentElement.classList.add('is-dark');
        darkBtn.classList.add('toggled');
        lightBtn.classList.remove('toggled');
      } else if (value === 1) {
        document.documentElement.classList.remove('is-dark');
        document.documentElement.classList.add('is-light');
        lightBtn.classList.add('toggled');
        darkBtn.classList.remove('toggled');
      } else {
        // Value 0: Use system theme
        document.documentElement.classList.remove('is-dark');
        document.documentElement.classList.remove('is-light');

        // Visual indicator on buttons follows system theme
        const isSystemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (isSystemDark) {
          darkBtn.classList.add('toggled');
          lightBtn.classList.remove('toggled');
        } else {
          lightBtn.classList.add('toggled');
          darkBtn.classList.remove('toggled');
        }
      }
    }

    function getCurrentThemePreference() {
      return new Promise((resolve) => {
        if (storageArea) {
          storageArea.get({ viewerCssTheme: 2 }, (items) => {
            resolve(items.viewerCssTheme);
          });
        } else {
          const localVal = localStorage.getItem('custom-pdfjs-theme') || 'dark';
          resolve(localVal === 'dark' ? 2 : 1);
        }
      });
    }

    function updateThemePreference(value) {
      if (storageArea) {
        storageArea.set({ viewerCssTheme: value }, () => {
          applyThemeClasses(value);
        });
      } else {
        localStorage.setItem('custom-pdfjs-theme', value === 2 ? 'dark' : 'light');
        applyThemeClasses(value);
      }
    }

    darkBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      updateThemePreference(2);
    });

    lightBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      updateThemePreference(1);
    });

    // Listen to changes in the extension settings (e.g. from the options page)
    if (storageArea) {
      chrome.storage.onChanged.addListener((changes, areaName) => {
        if (changes.viewerCssTheme) {
          applyThemeClasses(changes.viewerCssTheme.newValue);
        }
      });
    }

    // Listen to system theme changes in case of system theme override (value 0)
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      getCurrentThemePreference().then(applyThemeClasses);
    });

    // Load initial theme setting
    getCurrentThemePreference().then(applyThemeClasses);
  }
  // --- ZOOM DELTA OVERRIDE ---
  // The user requested \sqrt[3]{1.5} which is Math.pow(1.5, 1/3) ~ 1.1447
  const customZoomDelta = Math.pow(1.5, 1 / 3);
  let accumulateTicks = 0;


  window.addEventListener('wheel', (evt) => {
    if (evt.ctrlKey || evt.metaKey) {
      const app = window.PDFViewerApplication;
      const viewer = app && app.pdfViewer;
      if (!viewer) return;

      // Prevent native PDF.js wheel handler
      evt.preventDefault();
      evt.stopImmediatePropagation();

      let ticks = 0;
      // Handle DOM_DELTA_LINE/PAGE vs DOM_DELTA_PIXEL (trackpad)
      if (evt.deltaMode === 1 || evt.deltaMode === 2) {
        if (Math.abs(evt.deltaY) >= 1) {
          ticks = Math.sign(evt.deltaY);
        }
      } else {
        // DOM_DELTA_PIXEL mode (Chrome default for both mouse and trackpad)
        // A physical mouse wheel notch usually fires an event with a large deltaY (e.g., 33, 100, 133, etc.) 
        // depending on X-Mouse Button Control or Windows "lines to scroll" settings.
        if (Math.abs(evt.deltaY) >= 20) {
          // Hardware notch detected! Force EXACTLY 1 zoom step per physical notch.
          // This completely ignores X-Mouse multipliers, solving the "coarse scroll by 4 lines" issue.
          ticks = Math.sign(evt.deltaY);
          accumulateTicks = 0; // Reset any lingering trackpad delta
        } else {
          // Trackpad smooth scrolling: deltaY is typically very small per frame (e.g. 1 to 15).
          // We safely accumulate these tiny values to allow smooth, continuous pinch-to-zoom.
          const PIXELS_PER_LINE_STEP = 40;
          accumulateTicks += evt.deltaY;
          if (Math.abs(accumulateTicks) >= PIXELS_PER_LINE_STEP) {
            ticks = Math.trunc(accumulateTicks / PIXELS_PER_LINE_STEP);
            accumulateTicks -= ticks * PIXELS_PER_LINE_STEP;
          }
        }
      }

      if (ticks !== 0) {
        const S1 = viewer.currentScale;
        let newScale = S1;

        // Scroll down (positive delta) -> zoom out. Scroll up (negative delta) -> zoom in.
        if (ticks < 0) {
          newScale = newScale * Math.pow(customZoomDelta, -ticks);
        } else {
          newScale = newScale / Math.pow(customZoomDelta, ticks);
        }

        newScale = Math.max(0.1, Math.min(newScale, 10.0));

        // Zoom-to-cursor math
        const container = viewer.container;
        const rect = container.getBoundingClientRect();
        const M_x = evt.clientX - rect.left;
        const M_y = evt.clientY - rect.top;

        const oldScrollLeft = container.scrollLeft;
        const oldScrollTop = container.scrollTop;

        // Apply scale. PDF.js will layout synchronously
        viewer.currentScaleValue = newScale.toString();

        const S2 = viewer.currentScale;
        const ratio = S2 / S1;

        // Adjust scroll position to keep the mouse point stationary
        container.scrollLeft = (M_x + oldScrollLeft) * ratio - M_x;
        container.scrollTop = (M_y + oldScrollTop) * ratio - M_y;
      }
    }
  }, { passive: false, capture: true });


  // --- PAGE NUMBER FRACTION FORMATTER ---
  // The user requested to remove 'of' and make the page counter look like a mathematical fraction.
  // We use CSS for the horizontal line, and this observer strips out any non-digit text dynamically.
  const numPages = document.getElementById('numPages');
  if (numPages) {
    const stripOf = () => {
      const text = numPages.textContent;
      if (text) {
        // First try to parse pagesCount from the data-l10n-args attribute if present
        const argsAttr = numPages.getAttribute('data-l10n-args');
        if (argsAttr) {
          try {
            const args = JSON.parse(argsAttr);
            if (args && typeof args.pagesCount === 'number') {
              const pagesCountStr = String(args.pagesCount);
              if (text !== pagesCountStr) {
                numPages.textContent = pagesCountStr;
              }
              return;
            }
          } catch (e) {
            // Ignore error and fall back to regex
          }
        }

        // Fallback: extract only the last sequence of digits in textContent (which is the total pages)
        const matches = text.match(/\d+/g);
        if (matches && matches.length > 0) {
          const lastNum = matches[matches.length - 1];
          if (text !== lastNum) {
            numPages.textContent = lastNum;
          }
        }
      }
    };
    const observer = new MutationObserver(stripOf);
    observer.observe(numPages, { childList: true, characterData: true, subtree: true });
    stripOf(); // Trigger immediately for initial load
  }

  // --- CTRL+F FIND BAR TOGGLE ---
  window.addEventListener('keydown', (evt) => {
    // Check for Ctrl+F or Cmd+F
    const cmd = (evt.ctrlKey ? 1 : 0) | (evt.altKey ? 2 : 0) | (evt.shiftKey ? 4 : 0) | (evt.metaKey ? 8 : 0);
    if ((cmd === 1 || cmd === 8) && evt.keyCode === 70) {
      const app = window.PDFViewerApplication;
      if (app && app.findBar) {
        evt.preventDefault();
        evt.stopImmediatePropagation();
        app.findBar.toggle();
      }
    }
  }, { capture: true });

  // --- SEARCH BOX CLEAR BUTTON (X) ---
  const findInput = document.getElementById('findInput');
  if (findInput && !document.getElementById('findClearBtn')) {
    const clearBtn = document.createElement('button');
    clearBtn.id = 'findClearBtn';
    clearBtn.className = 'findbarClearBtn';
    clearBtn.title = 'Clear Search';
    clearBtn.innerHTML = '&times;'; // '×' sign
    clearBtn.style.setProperty('display', 'none', 'important');

    findInput.parentNode.insertBefore(clearBtn, findInput.nextSibling);

    const toggleClearBtn = () => {
      const show = !!findInput.value;
      clearBtn.style.setProperty('display', show ? 'flex' : 'none', 'important');
    };

    findInput.addEventListener('input', toggleClearBtn);
    findInput.addEventListener('keyup', toggleClearBtn);
    findInput.addEventListener('change', toggleClearBtn);
    findInput.addEventListener('focus', toggleClearBtn);

    clearBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      findInput.value = '';
      toggleClearBtn();
      findInput.focus();
      findInput.dispatchEvent(new Event('input', { bubbles: true }));
    });

    toggleClearBtn();
    console.log("PDFViewer clear button initialized successfully.");
  }

  // --- EDITOR PARAMS POPUPS ALIGNMENT ---
  const editorMappings = [
    { buttonId: 'editorHighlight', popupId: 'editorHighlightParamsToolbar' },
    { buttonId: 'editorFreeText', popupId: 'editorFreeTextParamsToolbar' },
    { buttonId: 'editorInk', popupId: 'editorInkParamsToolbar' },
    { buttonId: 'editorStamp', popupId: 'editorStampParamsToolbar' }
  ];

  const alignPopup = (buttonId, popupId) => {
    const button = document.getElementById(buttonId);
    const popup = document.getElementById(popupId);
    if (button && popup) {
      const btnRect = button.getBoundingClientRect();
      const popupRect = popup.getBoundingClientRect();

      const btnCenter = btnRect.top + (btnRect.height / 2);
      const popupTop = btnCenter - (popupRect.height / 2);

      popup.style.setProperty('top', `${popupTop}px`, 'important');
    }
  };

  editorMappings.forEach(({ buttonId, popupId }) => {
    const popup = document.getElementById(popupId);
    if (popup) {
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.attributeName === 'class' && !popup.classList.contains('hidden')) {
            alignPopup(buttonId, popupId);
          }
        });
      });
      observer.observe(popup, { attributes: true, attributeFilter: ['class'] });
    }
  });

  window.addEventListener('resize', () => {
    editorMappings.forEach(({ buttonId, popupId }) => {
      const popup = document.getElementById(popupId);
      if (popup && !popup.classList.contains('hidden')) {
        alignPopup(buttonId, popupId);
      }
    });
  });

}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCustomZoom);
} else {
  initCustomZoom();
}

