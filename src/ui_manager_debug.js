    // Global Drag & Drop Import
    const dragOverlay = document.getElementById('drag-overlay');
    let dragCounter = 0;

    const handleDragEnter = (e) => {
        e.preventDefault();
        dragCounter++;
        if (dragOverlay) dragOverlay.classList.add('active');
        console.log("Drag Enter: Counter", dragCounter);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        dragCounter--;
        if (dragCounter === 0 && dragOverlay) {
            dragOverlay.classList.remove('active');
        }
        console.log("Drag Leave: Counter", dragCounter);
    };
