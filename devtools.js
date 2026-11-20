chrome.devtools.panels.elements.createSidebarPane('⊙ Class Lens', (pane) => {
  pane.setPage('panel.html');
});

chrome.devtools.panels.create('⊙ Class Lens', 'icons/16.png', 'panel.html');
