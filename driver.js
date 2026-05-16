document.addEventListener('DOMContentLoaded', () => {
    const driverLogoutBtn = document.getElementById('driverLogoutBtn');
    const driverWelcomeTitle = document.getElementById('driverWelcomeTitle');
    const driverAccountMessage = document.getElementById('driverAccountMessage');
    const driverApprovalBadge = document.getElementById('driverApprovalBadge');
    const driverPendingPanel = document.getElementById('driverPendingPanel');
    const driverRejectedPanel = document.getElementById('driverRejectedPanel');
    const driverFormPanel = document.getElementById('driverFormPanel');

    const driverFleetNumber = document.getElementById('driverFleetNumber');
    const driverFleetNumberOptions = document.getElementById('driverFleetNumberOptions');
    const driverVehicleType = document.getElementById('driverVehicleType');
    const driverFleetError = document.getElementById('driverFleetError');

    const driverSelectAreaBtn = document.getElementById('driverSelectAreaBtn');
    const driverSelectSubcategoryBtn = document.getElementById('driverSelectSubcategoryBtn');
    const driverSelectedArea = document.getElementById('driverSelectedArea');
    const driverSelectedSubcategory = document.getElementById('driverSelectedSubcategory');
    const driverCategoryError = document.getElementById('driverCategoryError');

    const driverDefectDescription = document.getElementById('driverDefectDescription');
    const driverTakePhotoBtn = document.getElementById('driverTakePhotoBtn');
    const driverChoosePhotosBtn = document.getElementById('driverChoosePhotosBtn');
    const driverPhotoLibraryInput = document.getElementById('driverPhotoLibraryInput');
    const driverCameraInput = document.getElementById('driverCameraInput');
    const driverImagePreviewContainer = document.getElementById('driverImagePreviewContainer');
    const driverSubmitBtn = document.getElementById('driverSubmitBtn');
    const driverFormStatus = document.getElementById('driverFormStatus');

    const driverPickerModal = document.getElementById('driverPickerModal');
    const driverPickerModalTitle = document.getElementById('driverPickerModalTitle');
    const driverPickerModalDescription = document.getElementById('driverPickerModalDescription');
    const driverPickerModalOptions = document.getElementById('driverPickerModalOptions');
    const closeDriverPickerBtn = document.getElementById('closeDriverPickerBtn');

    let selectedArea = '';
    let selectedSubcategory = '';
    let selectedImages = [];
    let activeUser = null;
    let userRecordUnsubscribe = null;

    const setFormStatus = (message = '', type = '') => {
        driverFormStatus.textContent = message;
        driverFormStatus.className = `form-status ${type}`.trim();
    };

    const setFleetError = (message = '') => {
        driverFleetError.textContent = message;
        driverFleetNumber.classList.toggle('input-error', Boolean(message));
    };

    const setVehicleType = (type = '') => {
        driverVehicleType.textContent = type
            ? `Vehicle Type: ${type}`
            : 'Vehicle type will appear after choosing a fleet number.';
        driverVehicleType.classList.toggle('has-vehicle-type', Boolean(type));
    };

    const setCategoryError = (message = '') => {
        driverCategoryError.textContent = message;
    };

    const setApprovalBadge = (label, className) => {
        driverApprovalBadge.textContent = label;
        driverApprovalBadge.className = `driver-status-badge ${className}`.trim();
    };

    function renderFleetOptions() {
        driverFleetNumberOptions.innerHTML = '';
        window.FLEET_VEHICLES.forEach((vehicle) => {
            const option = document.createElement('option');
            option.value = vehicle.number;
            option.label = vehicle.type;
            driverFleetNumberOptions.appendChild(option);
        });
    }

    function validateFleetNumber() {
        const value = driverFleetNumber.value.trim();
        if (!value) {
            setFleetError('');
            setVehicleType('');
            return false;
        }

        const vehicleType = getVehicleTypeForFleetNumber(value);
        if (!vehicleType) {
            setFleetError('Choose a fleet number from the Burnley Bus Company list.');
            setVehicleType('');
            return false;
        }

        setFleetError('');
        setVehicleType(vehicleType);
        return true;
    }

    function renderCategorySelection() {
        driverSelectedArea.textContent = selectedArea || 'No area selected yet.';
        driverSelectedArea.classList.toggle('has-selection', Boolean(selectedArea));

        const subcategories = getSubcategoriesForArea(selectedArea);
        driverSelectSubcategoryBtn.disabled = !selectedArea || subcategories.length === 0;

        if (!selectedArea) {
            driverSelectedSubcategory.textContent = 'Choose an area first.';
            driverSelectedSubcategory.classList.remove('has-selection');
            return;
        }

        if (!selectedSubcategory) {
            driverSelectedSubcategory.textContent = subcategories.length
                ? 'No subcategory selected yet.'
                : 'No subcategories available for this area yet.';
            driverSelectedSubcategory.classList.remove('has-selection');
            return;
        }

        driverSelectedSubcategory.textContent = selectedSubcategory;
        driverSelectedSubcategory.classList.add('has-selection');
    }

    function validateCategorySelection() {
        if (!selectedArea || !selectedSubcategory) {
            setCategoryError('Choose both a defect area and a subcategory.');
            return false;
        }
        setCategoryError('');
        return true;
    }

    function renderImagePreviews() {
        driverImagePreviewContainer.innerHTML = '';
        selectedImages.slice(0, 3).forEach((file) => {
            const reader = new FileReader();
            reader.onload = (event) => {
                const image = document.createElement('img');
                image.src = event.target.result;
                image.className = 'image-preview';
                driverImagePreviewContainer.appendChild(image);
            };
            reader.readAsDataURL(file);
        });
    }

    function addImages(files) {
        const incomingFiles = Array.from(files || []).filter((file) => file.type.startsWith('image/'));
        if (!incomingFiles.length) return;

        selectedImages = [...selectedImages, ...incomingFiles].slice(0, 3);
        if (incomingFiles.length + selectedImages.length > 3) {
            setFormStatus('Only the first 3 images will be kept.', 'error');
        }
        renderImagePreviews();
    }

    function closePickerModal() {
        driverPickerModal.hidden = true;
        driverPickerModalOptions.innerHTML = '';
    }

    function openPickerModal({ title, description, options, onSelect }) {
        driverPickerModalTitle.textContent = title;
        driverPickerModalDescription.textContent = description || '';
        driverPickerModalOptions.innerHTML = '';

        options.forEach((optionValue) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'picker-option-btn';
            button.textContent = optionValue;
            button.addEventListener('click', () => {
                onSelect(optionValue);
                closePickerModal();
            });
            driverPickerModalOptions.appendChild(button);
        });

        driverPickerModal.hidden = false;
    }

    async function uploadImages() {
        const imageUrls = [];
        for (const file of selectedImages) {
            const imageRef = firebase.storage().ref().child(`defect_images/${Date.now()}_${file.name}`);
            await imageRef.put(file);
            imageUrls.push(await imageRef.getDownloadURL());
        }
        return imageUrls;
    }

    function resetForm() {
        driverFleetNumber.value = '';
        driverDefectDescription.value = '';
        selectedArea = '';
        selectedSubcategory = '';
        selectedImages = [];
        setFleetError('');
        setVehicleType('');
        setCategoryError('');
        setFormStatus('');
        renderCategorySelection();
        renderImagePreviews();
        driverPhotoLibraryInput.value = '';
        driverCameraInput.value = '';
    }

    async function submitDefect() {
        const fleetNumber = driverFleetNumber.value.trim();
        const description = driverDefectDescription.value.trim();

        if (!activeUser) {
            setFormStatus('You are not signed in. Please sign in again.', 'error');
            window.location.href = './driver-login.html';
            return;
        }

        if (!fleetNumber || !description) {
            setFormStatus('Enter a fleet number and defect description before submitting.', 'error');
            return;
        }

        if (!validateFleetNumber() || !validateCategorySelection()) {
            setFormStatus('Check the fleet number, defect area, and subcategory.', 'error');
            return;
        }

        driverSubmitBtn.disabled = true;
        setFormStatus('Submitting defect for approval...', 'info');

        try {
            const imageUrls = await uploadImages();
            const vehicleType = getVehicleTypeForFleetNumber(fleetNumber);
            await driverDb.collection('pendingDefects').add({
                fleetNumber,
                busType: vehicleType,
                locationArea: selectedArea,
                subcategory: selectedSubcategory,
                description,
                timestamp: new Date().toISOString(),
                imageUrls,
                submittedByUid: activeUser.uid,
                submittedByName: activeUser.displayName || activeUser.email || 'Unknown'
            });

            resetForm();
            setFormStatus('Defect submitted for approval.', 'success');
        } catch (error) {
            console.error('Could not submit pending defect:', error);
            setFormStatus(error.message || 'Could not submit the defect right now.', 'error');
        } finally {
            driverSubmitBtn.disabled = false;
        }
    }

    function applyAccessState(user, userRecord) {
        activeUser = user;

        if (!user) {
            window.location.href = './driver-login.html';
            return;
        }

        driverWelcomeTitle.textContent = user.displayName
            ? `Hello ${user.displayName}`
            : `Hello ${user.email || 'Driver'}`;

        const accessState = resolveDriverAccessState(userRecord);

        if (accessState === DriverAccessState.ALLOWED) {
            setApprovalBadge('Approved', 'approved');
            driverAccountMessage.textContent = 'Your account is approved. Defects you submit here go into the approval queue for the admin app.';
            driverPendingPanel.hidden = true;
            driverRejectedPanel.hidden = true;
            driverFormPanel.hidden = false;
            return;
        }

        if (accessState === DriverAccessState.PENDING) {
            setApprovalBadge('Pending', 'pending');
            driverAccountMessage.textContent = 'Your account exists, but an administrator still needs to approve it.';
            driverPendingPanel.hidden = false;
            driverRejectedPanel.hidden = true;
            driverFormPanel.hidden = true;
            return;
        }

        setApprovalBadge('Blocked', 'rejected');
        driverAccountMessage.textContent = 'This account is not currently approved to use the driver web app.';
        driverPendingPanel.hidden = true;
        driverRejectedPanel.hidden = false;
        driverFormPanel.hidden = true;
    }

    async function syncAccessState(user) {
        activeUser = user;

        if (!user) {
            if (userRecordUnsubscribe) {
                userRecordUnsubscribe();
                userRecordUnsubscribe = null;
            }
            window.location.href = './driver-login.html';
            return;
        }

        try {
            const initialRecord = await getDriverUserRecord(user.uid);
            applyAccessState(user, initialRecord);

            if (userRecordUnsubscribe) {
                userRecordUnsubscribe();
            }

            userRecordUnsubscribe = driverDb.collection('users').doc(user.uid).onSnapshot((snapshot) => {
                applyAccessState(user, snapshot.exists ? snapshot.data() : null);
            }, (error) => {
                console.error('Live driver access listener failed:', error);
            });
        } catch (error) {
            console.error('Error resolving driver access state:', error);
            setApprovalBadge('Error', 'rejected');
            driverAccountMessage.textContent = 'We could not verify your access right now. Please refresh and try again.';
            driverPendingPanel.hidden = false;
            driverRejectedPanel.hidden = true;
            driverFormPanel.hidden = true;
        }
    }

    driverLogoutBtn.addEventListener('click', async () => {
        await driverAuth.signOut();
        window.location.href = './driver-login.html';
    });

    driverFleetNumber.addEventListener('input', validateFleetNumber);
    driverTakePhotoBtn.addEventListener('click', () => driverCameraInput.click());
    driverChoosePhotosBtn.addEventListener('click', () => driverPhotoLibraryInput.click());
    driverPhotoLibraryInput.addEventListener('change', (event) => addImages(event.target.files));
    driverCameraInput.addEventListener('change', (event) => addImages(event.target.files));
    driverSubmitBtn.addEventListener('click', submitDefect);

    driverSelectAreaBtn.addEventListener('click', () => {
        openPickerModal({
            title: 'Choose Defect Area',
            description: 'Pick the main part of the bus where the defect is located.',
            options: getDefectCategoryAreas(),
            onSelect: (value) => {
                selectedArea = value;
                selectedSubcategory = '';
                setCategoryError('');
                renderCategorySelection();
            }
        });
    });

    driverSelectSubcategoryBtn.addEventListener('click', () => {
        const subcategories = getSubcategoriesForArea(selectedArea);
        if (!selectedArea || !subcategories.length) {
            setCategoryError('Choose an area with available subcategories first.');
            return;
        }

        openPickerModal({
            title: `Choose ${selectedArea} Subcategory`,
            description: 'Pick the more specific part of the bus linked to this defect.',
            options: subcategories,
            onSelect: (value) => {
                selectedSubcategory = value;
                setCategoryError('');
                renderCategorySelection();
            }
        });
    });

    closeDriverPickerBtn.addEventListener('click', closePickerModal);
    driverPickerModal.addEventListener('click', (event) => {
        if (event.target.dataset.closeDriverPicker === 'true') {
            closePickerModal();
        }
    });

    Promise.all([loadCustomFleetVehicles(), loadDefectCategories()]).then(() => {
        renderFleetOptions();
        renderCategorySelection();
        validateFleetNumber();
    }).catch((error) => {
        console.error('Error loading driver web app data:', error);
        setFormStatus('Some lookup data could not load. Please refresh the page.', 'error');
    });

    driverAuth.onAuthStateChanged(syncAccessState);
});
