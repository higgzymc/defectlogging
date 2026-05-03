document.addEventListener('DOMContentLoaded', () => {
    const logDefectBtn = document.getElementById('logDefectBtn');
    const fleetNumberInput = document.getElementById('fleetNumber');
    const fleetNumberOptions = document.getElementById('fleetNumberOptions');
    const fleetNumberError = document.getElementById('fleetNumberError');
    const selectedVehicleType = document.getElementById('selectedVehicleType');
    const newFleetNumberInput = document.getElementById('newFleetNumber');
    const newFleetTypeInput = document.getElementById('newFleetType');
    const addFleetVehicleBtn = document.getElementById('addFleetVehicleBtn');
    const addFleetVehicleStatus = document.getElementById('addFleetVehicleStatus');
    const defectDescriptionInput = document.getElementById('defectDescription');
    const defectImageInput = document.getElementById('defectImageInput');
    const imagePreviewContainer = document.getElementById('imagePreviewContainer');
    const multiImageUploadArea = document.getElementById('multiImageUploadArea');

    function renderFleetNumberOptions() {
        fleetNumberOptions.innerHTML = '';
        window.FLEET_VEHICLES.forEach((vehicle) => {
            const option = document.createElement('option');
            option.value = vehicle.number;
            option.label = vehicle.type;
            fleetNumberOptions.appendChild(option);
        });
    }

    function setFleetNumberError(message) {
        fleetNumberError.textContent = message;
        fleetNumberInput.classList.toggle('input-error', message !== '');
    }

    function setSelectedVehicleType(type) {
        selectedVehicleType.textContent = type ? `Vehicle Type: ${type}` : 'Vehicle type will appear after choosing a fleet number.';
        selectedVehicleType.classList.toggle('has-vehicle-type', Boolean(type));
    }

    function validateFleetNumber() {
        const fleetNumber = fleetNumberInput.value.trim();
        if (fleetNumber === '') {
            setFleetNumberError('');
            setSelectedVehicleType('');
            return false;
        }
        const vehicleType = getVehicleTypeForFleetNumber(fleetNumber);
        if (!vehicleType) {
            setFleetNumberError('That fleet number is not on the Burnley Bus Company list.');
            setSelectedVehicleType('');
            return false;
        }
        setFleetNumberError('');
        setSelectedVehicleType(vehicleType);
        return true;
    }

    async function addFleetVehicle() {
        const number = newFleetNumberInput.value.trim();
        const type = newFleetTypeInput.value.trim();

        if (number === '' || type === '') {
            addFleetVehicleStatus.textContent = 'Enter both the fleet number and vehicle type.';
            addFleetVehicleStatus.className = 'form-status error';
            return;
        }

        addFleetVehicleBtn.disabled = true;
        addFleetVehicleStatus.textContent = 'Adding fleet number...';
        addFleetVehicleStatus.className = 'form-status';

        try {
            const result = await saveCustomFleetVehicle({ number, type });
            renderFleetNumberOptions();
            fleetNumberInput.value = number;
            validateFleetNumber();
            newFleetNumberInput.value = '';
            newFleetTypeInput.value = '';
            addFleetVehicleStatus.textContent = result.savedToCloud
                ? `Fleet ${number} added.`
                : `Fleet ${number} added on this device. It could not sync to the shared database.`;
            addFleetVehicleStatus.className = result.savedToCloud ? 'form-status success' : 'form-status error';
        } catch (error) {
            console.error('Error adding fleet vehicle:', error);
            addFleetVehicleStatus.textContent = 'Could not add that fleet number. Please try again.';
            addFleetVehicleStatus.className = 'form-status error';
        } finally {
            addFleetVehicleBtn.disabled = false;
        }
    }

    renderFleetNumberOptions();

    auth.onAuthStateChanged(async (user) => {
        if (!user) return;
        await loadCustomFleetVehicles();
        renderFleetNumberOptions();
        validateFleetNumber();
    });

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
        if (!validateFleetNumber()) {
            alert('Please choose a fleet number from the Burnley Bus Company list.');
            fleetNumberInput.focus();
            return;
        }
        const vehicleType = getVehicleTypeForFleetNumber(fleetNumber);
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
            busType: vehicleType,
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
            setFleetNumberError('');
            setSelectedVehicleType('');
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

    fleetNumberInput.addEventListener('input', validateFleetNumber);
    addFleetVehicleBtn.addEventListener('click', addFleetVehicle);

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
