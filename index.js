document.addEventListener('DOMContentLoaded', () => {
    const logDefectBtn = document.getElementById('logDefectBtn');
    const fleetNumberInput = document.getElementById('fleetNumber');
    const defectDescriptionInput = document.getElementById('defectDescription');
    const defectImageInput = document.getElementById('defectImageInput');
    const imagePreviewContainer = document.getElementById('imagePreviewContainer');
    const multiImageUploadArea = document.getElementById('multiImageUploadArea');

    logDefectBtn.addEventListener('click', async () => {
        const fleetNumber = fleetNumberInput.value.trim();
        const defectDescription = defectDescriptionInput.value.trim();
        const loggedInUser = auth.currentUser;
        const imageFiles = defectImageInput.files;

        if (!loggedInUser) {
            alert('You are not logged in. Please log in first.');
            redirectToLogin();
            return;
        }
        if (fleetNumber === '' || defectDescription === '') {
            alert('Please enter both the Fleet Number and Defect Description.');
            return;
        }
        if (imageFiles.length > 3) {
            alert('You can only upload a maximum of 3 images per defect.');
            return;
        }

        logDefectBtn.disabled = true;
        logDefectBtn.textContent = 'Logging...';

        const imageUrls = [];
        if (imageFiles.length > 0) {
            for (const file of imageFiles) {
                if (file.type.startsWith('image/')) {
                    try {
                        const imageFileName = `${Date.now()}_${file.name}`;
                        const imageRef = storage.ref().child(`defect_images/${imageFileName}`);
                        await imageRef.put(file);
                        const url = await imageRef.getDownloadURL();
                        imageUrls.push(url);
                    } catch (error) {
                        console.error(`Error uploading image:`, error);
                        alert(`Error uploading an image. Skipping it.`);
                    }
                }
            }
        }

        const newDefect = {
            fleetNumber: fleetNumber,
            description: defectDescription,
            timestamp: new Date().toISOString(),
            isFixed: false,
            loggedInUser: loggedInUser.uid,
            userName: loggedInUser.displayName || loggedInUser.email,
            comments: [],
            imageUrls: imageUrls
        };

        try {
            await db.collection("defects").add(newDefect);
            alert('Defect logged successfully!');
            fleetNumberInput.value = '';
            defectDescriptionInput.value = '';
            defectImageInput.value = '';
            imagePreviewContainer.innerHTML = '';
        } catch (error) {
            console.error("Error logging defect: ", error);
            alert("Error logging defect. Please try again.");
        } finally {
            logDefectBtn.disabled = false;
            logDefectBtn.textContent = 'Log Defect';
        }
    });

    // Image preview and drag-and-drop logic
    defectImageInput.addEventListener('change', (event) => {
        imagePreviewContainer.innerHTML = '';
        const files = event.target.files;
        if (files.length > 3) {
            alert("You can select up to 3 images only.");
        }
        for (let i = 0; i < Math.min(files.length, 3); i++) {
            const file = files[i];
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const img = document.createElement('img');
                    img.src = e.target.result;
                    img.classList.add('image-preview');
                    imagePreviewContainer.appendChild(img);
                };
                reader.readAsDataURL(file);
            }
        }
    });

    multiImageUploadArea.addEventListener('dragover', (e) => { e.preventDefault(); });
    multiImageUploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        defectImageInput.files = e.dataTransfer.files;
        defectImageInput.dispatchEvent(new Event('change', { bubbles: true }));
    });
});
