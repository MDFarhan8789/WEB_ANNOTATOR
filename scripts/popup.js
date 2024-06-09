document.addEventListener("DOMContentLoaded", () => {
  chrome.storage.local.get(["highlights", "notes"], (result) => {
    const highlights = result.highlights || [];
    const notes = result.notes || [];
    const annotationList = document.getElementById("annotation-list");
    annotationList.innerHTML = "";

    highlights.forEach((highlight, index) => {
      const listItem = document.createElement("li");
      listItem.innerHTML = `Highlight ${index + 1}: ${highlight.content} - ${
        highlight.timestamp
      }`;
      const deleteButton = document.createElement("button");
      deleteButton.textContent = "Delete";
      deleteButton.addEventListener("click", () => {
        deleteAnnotation(index);
      });
      listItem.appendChild(deleteButton);
      annotationList.appendChild(listItem);
    });

    notes.forEach((note, index) => {
      const listItem = document.createElement("li");
      listItem.innerHTML = `Note ${index + 1}: ${note.content} - ${
        note.timestamp
      }`;
      const deleteButton = document.createElement("button");
      deleteButton.textContent = "Delete";
      deleteButton.addEventListener("click", () => {
        deleteNote(index);
      });
      listItem.appendChild(deleteButton);
      annotationList.appendChild(listItem);
    });
  });

  // Search and filter functionality
  const searchInput = document.getElementById("search-input");
  searchInput.addEventListener("input", () => {
    const searchText = searchInput.value.trim().toLowerCase();
    const annotationItems = document.querySelectorAll("#annotation-list li");

    annotationItems.forEach((item) => {
      const annotationText = item.textContent.toLowerCase();
      if (annotationText.includes(searchText)) {
        item.style.display = "block";
      } else {
        item.style.display = "none";
      }
    });
  });
});

// Delete annotation
function deleteAnnotation(index) {
  chrome.storage.local.get(["highlights"], (result) => {
    let highlights = result.highlights || [];
    if (index >= 0 && index < highlights.length) {
      highlights.splice(index, 1);
      chrome.storage.local.set({ highlights: highlights }, () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          chrome.tabs.sendMessage(tabs[0].id, { type: "reload" });
        });
      });
    }
  });
  location.reload(); 
}

// Delete note
function deleteNote(index) {
  chrome.storage.local.get(["notes"], (result) => {
    let notes = result.notes || [];
    if (index >= 0 && index < notes.length) {
      notes.splice(index, 1);
      chrome.storage.local.set({ notes: notes }, () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          chrome.tabs.sendMessage(tabs[0].id, { type: "reload" });
        });
      });
    }
  });
  location.reload(); 
}
