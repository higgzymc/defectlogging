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
    const selectAreaBtn = document.getElementById('selectAreaBtn');
    const selectSubcategoryBtn = document.getElementById('selectSubcategoryBtn');
    const selectedAreaDisplay = document.getElementById('selectedAreaDisplay');
    const selectedSubcategoryDisplay = document.getElementById('selectedSubcategoryDisplay');
    const categoryError = document.getElementById('categoryError');
    const pickerModal = document.getElementById('pickerModal');
    const pickerModalTitle = document.getElementById('pickerModalTitle');
    const pickerModalDescription = document.getElementById('pickerModalDescription');
    const pickerModalOptions = document.getElementById('pickerModalOptions');
    const closePickerModalBtn = document.getElementById('closePickerModalBtn');

    let selectedArea = '';
    let selectedSubcategory = '';
    let pickerCloseHandler = null;

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

    function setCategoryError(message) {
        categoryError.textContent = message;
    }

    function renderCategorySelection() {
        selectedAreaDisplay.textContent = selectedArea || 'No area selected yet.';
        selectedAreaDisplay.classList.toggle('has-selection', Boolean(selectedArea));

        const subcategories = getSubcategoriesForArea(selectedArea);
        selectSubcategoryBtn.disabled = !selectedArea || subcategories.length === 0;

        if (!selectedArea) {
            selectedSubcategoryDisplay.textContent = 'Choose an area first.';
            selectedSubcategoryDisplay.classList.remove('has-selection');
            return;
        }

        if (!selectedSubcategory) {
            selectedSubcategoryDisplay.textContent = subcategories.length > 0
                ? 'No subcategory selected yet.'
                : 'No subcategories available for this area yet.';
            selectedSubcategoryDisplay.classList.remove('has-selection');
            return;
        }

        selectedSubcategoryDisplay.textContent = selectedSubcategory;
        selectedSubcategoryDisplay.classList.add('has-selection');
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

    function validateCategorySelection() {
        if (!selectedArea || !selectedSubcategory) {
            setCategoryError('Choose both a defect area and a subcategory before logging the defect.');
            return false;
        }
        setCategoryError('');
        return true;
    }

    function closePickerModal() {
        pickerModal.hidden = true;
        pickerModalOptions.innerHTML = '';
        pickerCloseHandler = null;
    }

    function openPickerModal({ title, description, options, onSelect }) {
        pickerModalTitle.textContent = title;
        pickerModalDescription.textContent = description || '';
        pickerModalOptions.innerHTML = '';

        options.forEach((optionValue) => {
            const optionButton = document.createElement('button');
            optionButton.type = 'button';
            optionButton.className = 'picker-option-btn';
            optionButton.textContent = optionValue;
            optionButton.addEventListener('click', () => {
                onSelect(optionValue);
                closePickerModal();
            });
            pickerModalOptions.appendChild(optionButton);
        });

        pickerCloseHandler = (event) => {
            if (event.target.dataset.closePicker === 'true') {
                closePickerModal();
            }
        };

        pickerModal.hidden = false;
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

    async function handleLogDefect() {
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
        if (!validateCategorySelection()) {
            alert('Choose a defect area and subcategory before logging the defect.');
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
                if (!file.type.startsWith('image/')) continue;
                try {
                    const imageFileName = `${Date.now()}_${file.name}`;
                    const imageRef = storage.ref().child(`defect_images/${imageFileName}`);
                    await imageRef.put(file);
                    const url = await imageRef.getDownloadURL();
                    imageUrls.push(url);
                } catch (error) {
                    console.error('Error uploading image:', error);
                    alert('Error uploading an image. Skipping it.');
                }
            }
        }

        const newDefect = {
            fleetNumber,
            busType: vehicleType,
            locationArea: selectedArea,
            subcategory: selectedSubcategory,
            description: defectDescription,
            timestamp: new Date().toISOString(),
            isFixed: false,
            loggedInUser: loggedInUser.uid,
            userName: loggedInUser.displayName || loggedInUser.email,
            comments: [],
            imageUrls
        };

        try {
            await db.collection('defects').add(newDefect);
            alert('Defect logged successfully!');
            fleetNumberInput.value = '';
            setFleetNumberError('');
            setSelectedVehicleType('');
            defectDescriptionInput.value = '';
            defectImageInput.value = '';
            imagePreviewContainer.innerHTML = '';
            selectedArea = '';
            selectedSubcategory = '';
            renderCategorySelection();
            setCategoryError('');
        } catch (error) {
            console.error('Error logging defect:', error);
            alert('Error logging defect. Please try again.');
        } finally {
            logDefectBtn.disabled = false;
            logDefectBtn.textContent = 'Log Defect';
        }
    }

    renderFleetNumberOptions();
    renderCategorySelection();

    auth.onAuthStateChanged(async (user) => {
        if (!user) return;
        await Promise.all([loadCustomFleetVehicles(), loadDefectCategories()]);
        renderFleetNumberOptions();
        renderCategorySelection();
        validateFleetNumber();
    });

    fleetNumberInput.addEventListener('input', validateFleetNumber);
    addFleetVehicleBtn.addEventListener('click', addFleetVehicle);
    logDefectBtn.addEventListener('click', handleLogDefect);

    selectAreaBtn.addEventListener('click', () => {
        const areas = getDefectCategoryAreas();
        openPickerModal({
            title: 'Choose Defect Area',
            description: 'Pick the main part of the vehicle where the defect is located.',
            options: areas,
            onSelect: (value) => {
                selectedArea = value;
                selectedSubcategory = '';
                setCategoryError('');
                renderCategorySelection();
            }
        });
    });

    selectSubcategoryBtn.addEventListener('click', () => {
        const subcategories = getSubcategoriesForArea(selectedArea);
        if (!selectedArea || subcategories.length === 0) {
            setCategoryError('Choose an area with available subcategories first.');
            return;
        }
        openPickerModal({
            title: `Choose ${selectedArea} Subcategory`,
            description: 'Pick the more specific defect location.',
            options: subcategories,
            onSelect: (value) => {
                selectedSubcategory = value;
                setCategoryError('');
                renderCategorySelection();
            }
        });
    });

    closePickerModalBtn.addEventListener('click', closePickerModal);
    pickerModal.addEventListener('click', (event) => {
        if (pickerCloseHandler) {
            pickerCloseHandler(event);
        }
    });

    defectImageInput.addEventListener('change', (event) => {
        imagePreviewContainer.innerHTML = '';
        const files = event.target.files;
        if (files.length > 3) {
            alert('You can select up to 3 images only.');
        }
        for (let i = 0; i < Math.min(files.length, 3); i += 1) {
            const file = files[i];
            if (!file.type.startsWith('image/')) continue;
            const reader = new FileReader();
            reader.onload = (loadEvent) => {
                const img = document.createElement('img');
                img.src = loadEvent.target.result;
                img.classList.add('image-preview');
                imagePreviewContainer.appendChild(img);
            };
            reader.readAsDataURL(file);
        }
    });

    multiImageUploadArea.addEventListener('dragover', (event) => {
        event.preventDefault();
    });

    multiImageUploadArea.addEventListener('drop', (event) => {
        event.preventDefault();
        defectImageInput.files = event.dataTransfer.files;
        defectImageInput.dispatchEvent(new Event('change', { bubbles: true }));
    });
});
