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

    const driverOpenDefectsList = document.getElementById('driverOpenDefectsList');
    const driverFixedDefectsList = document.getElementById('driverFixedDefectsList');
    const driverRepeatingDefectsList = document.getElementById('driverRepeatingDefectsList');
    const driverOpenCount = document.getElementById('driverOpenCount');
    const driverOpenFleetCount = document.getElementById('driverOpenFleetCount');
    const driverFixedCount = document.getElementById('driverFixedCount');
    const driverRepeatingCount = document.getElementById('driverRepeatingCount');
    const driverRepeatingFleetCount = document.getElementById('driverRepeatingFleetCount');
    const driverRepeatThreshold = document.getElementById('driverRepeatThreshold');
    const driverRepeatThresholdValue = document.getElementById('driverRepeatThresholdValue');

    let selectedArea = '';
    let selectedSubcategory = '';
    let selectedImages = [];
    let activeUser = null;
    let userRecordUnsubscribe = null;
    let defectsUnsubscribe = null;
    let currentAllDefects = [];
    let currentRepeatingGroups = [];
    let userDisplayNames = {};

    const DriverAccessState = window.DriverAccessState || {
        ALLOWED: 'allowed',
        PENDING: 'pending',
        REJECTED: 'rejected',
        DENIED: 'denied'
    };

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

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function formatDateTimeValue(value) {
        if (!value) return 'N/A';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return 'N/A';
        return date.toLocaleString('en-GB');
    }

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

        const previousLength = selectedImages.length;
        selectedImages = [...selectedImages, ...incomingFiles].slice(0, 3);
        if (previousLength + incomingFiles.length > 3) {
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

    function defectPatternText(defect) {
        return [defect.locationArea, defect.subcategory, defect.description]
            .map((value) => String(value || '').trim())
            .filter(Boolean)
            .join(' - ');
    }

    function levenshteinDistance(str1, str2) {
        const track = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
        for (let i = 0; i <= str1.length; i += 1) track[0][i] = i;
        for (let j = 0; j <= str2.length; j += 1) track[j][0] = j;
        for (let j = 1; j <= str2.length; j += 1) {
            for (let i = 1; i <= str1.length; i += 1) {
                const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
                track[j][i] = Math.min(
                    track[j][i - 1] + 1,
                    track[j - 1][i] + 1,
                    track[j - 1][i - 1] + indicator
                );
            }
        }
        return track[str2.length][str1.length];
    }

    function calculateSimilarity(str1, str2) {
        if (!str1 || !str2) return 0;
        const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
        const maxLen = Math.max(str1.length, str2.length);
        return Math.round((1 - distance / maxLen) * 100);
    }

    function getDefectTimestampValue(defect) {
        if (!defect || !defect.timestamp) return 0;
        const parsedTime = new Date(defect.timestamp).getTime();
        return Number.isNaN(parsedTime) ? 0 : parsedTime;
    }

    function analyzeRepeatingDefects(defects, similarityThreshold = 80) {
        const groupedByFleet = {};
        defects.forEach((defect) => {
            const fleetNumber = defect.fleetNumber || 'Unknown';
            if (!groupedByFleet[fleetNumber]) groupedByFleet[fleetNumber] = [];
            groupedByFleet[fleetNumber].push(defect);
        });

        const repeatingGroups = [];
        Object.keys(groupedByFleet).forEach((fleetNumber) => {
            const fleetDefects = groupedByFleet[fleetNumber];
            if (fleetDefects.length < 2) return;

            const clusters = [];
            fleetDefects.forEach((defect) => {
                let matchedCluster = null;
                for (const cluster of clusters) {
                    const similarity = calculateSimilarity(defectPatternText(defect), defectPatternText(cluster[0]));
                    if (similarity >= similarityThreshold) {
                        matchedCluster = cluster;
                        break;
                    }
                }
                if (matchedCluster) matchedCluster.push(defect);
                else clusters.push([defect]);
            });

            clusters.forEach((cluster) => {
                if (cluster.length < 2) return;
                const sortedCluster = [...cluster].sort((a, b) => getDefectTimestampValue(a) - getDefectTimestampValue(b));
                const hasOutstandingDefect = sortedCluster.some((defect) => !defect.isFixed);
                if (!hasOutstandingDefect) return;
                const latestDefect = sortedCluster[sortedCluster.length - 1];
                repeatingGroups.push({
                    fleetNumber,
                    count: sortedCluster.length,
                    defects: sortedCluster,
                    description: defectPatternText(sortedCluster[0]),
                    similarity: calculateSimilarity(defectPatternText(sortedCluster[0]), defectPatternText(sortedCluster[1] || {})),
                    hasOutstandingDefect,
                    latestStatusIsFixed: latestDefect ? !!latestDefect.isFixed : false,
                    latestDefect
                });
            });
        });
        return repeatingGroups;
    }

    function buildAreaBadgeHtml(defect) {
        const area = String(defect.locationArea || '').trim();
        const subcategory = String(defect.subcategory || '').trim();
        if (!area && !subcategory) {
            return '<span class="detail-chip muted-chip">Area not set</span>';
        }
        const chips = [];
        if (area) chips.push(`<span class="detail-chip">${escapeHtml(area)}</span>`);
        if (subcategory) chips.push(`<span class="detail-chip subtle-chip">${escapeHtml(subcategory)}</span>`);
        return chips.join('');
    }

    function formatCommentsHtml(comments) {
        if (!comments || comments.length === 0) return '<p class="driver-muted-copy">No comments yet.</p>';
        const sortedComments = [...comments].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        return sortedComments.map((comment) => `
            <div class="comment-item">
                <span>${escapeHtml(comment.user || 'Unknown')} on ${formatDateTimeValue(comment.timestamp)}:</span>
                ${escapeHtml(comment.text || '')}
            </div>
        `).join('');
    }

    function renderDriverDefectCard(defect) {
        const card = document.createElement('div');
        card.className = 'defect-item';
        if (defect.isFixed) {
            card.classList.add('fixed-defect');
        } else {
            const ageInDays = (new Date() - new Date(defect.timestamp)) / (1000 * 60 * 60 * 24);
            if (ageInDays >= 28) card.classList.add('red-defect');
            else if (ageInDays >= 14) card.classList.add('amber-defect');
        }

        const imageUrls = Array.isArray(defect.imageUrls) ? defect.imageUrls : [];
        const imagesHtml = imageUrls.length > 0
            ? `<div class="defect-image-display">${imageUrls.map((url) => `<a href="${url}" target="_blank" rel="noopener noreferrer"><img src="${url}" alt="Defect image" class="defect-image" loading="lazy"></a>`).join('')}</div>`
            : '';

        card.innerHTML = `
            <div class="defect-card-topline">
                <div>
                    <div class="defect-card-title">Fleet ${escapeHtml(defect.fleetNumber || 'N/A')}</div>
                    <div class="defect-card-subtitle">${escapeHtml(defect.busType || getVehicleTypeForFleetNumber(defect.fleetNumber) || 'Unknown')}</div>
                </div>
                <div class="defect-card-status ${defect.isFixed ? 'status-fixed' : 'status-open'}">${defect.isFixed ? 'Fixed' : 'Outstanding'}</div>
            </div>
            <div class="detail-chip-row">
                ${buildAreaBadgeHtml(defect)}
            </div>
            <p><strong>Defect:</strong> ${escapeHtml(defect.description || 'N/A')}</p>
            <p><strong>Logged By:</strong> ${escapeHtml(userDisplayNames[defect.loggedInUser] || defect.userName || 'Unknown')}</p>
            <p><strong>Logged On:</strong> ${formatDateTimeValue(defect.timestamp)}</p>
            ${imagesHtml}
            <div class="comments-container">${formatCommentsHtml(defect.comments)}</div>
        `;
        return card;
    }

    async function fetchUserNames(defects) {
        const userIds = [...new Set(defects.map((d) => d.loggedInUser).filter((uid) => uid && !userDisplayNames[uid]))];
        if (userIds.length === 0) return;
        for (const uid of userIds) {
            userDisplayNames[uid] = await getDisplayNameForUser(uid);
        }
    }

    function renderDefectFeed(targetElement, defects, emptyMessage) {
        targetElement.innerHTML = '';
        if (defects.length === 0) {
            targetElement.innerHTML = `<p>${emptyMessage}</p>`;
            return;
        }
        defects.forEach((defect) => targetElement.appendChild(renderDriverDefectCard(defect)));
    }

    function renderRepeatingGroups() {
        driverRepeatingDefectsList.innerHTML = '';
        if (currentRepeatingGroups.length === 0) {
            driverRepeatingDefectsList.innerHTML = '<p>No repeating defects found right now.</p>';
            return;
        }

        currentRepeatingGroups.forEach((group) => {
            const groupCard = document.createElement('div');
            groupCard.className = 'repeating-group driver-repeating-group';
            groupCard.innerHTML = `
                <div class="repeating-group-header">
                    <h3>Fleet ${escapeHtml(group.fleetNumber)} - ${group.count} similar issues</h3>
                    <p><strong>Vehicle Type:</strong> ${escapeHtml(getVehicleTypeForFleetNumber(group.fleetNumber) || 'Unknown')}</p>
                    <p><strong>Pattern:</strong> ${escapeHtml(group.description || 'N/A')}</p>
                    <p><strong>Similarity:</strong> ${group.similarity}%</p>
                    <p><strong>Latest status:</strong> ${group.latestStatusIsFixed ? 'Fixed' : 'Outstanding'}</p>
                    <p><strong>Last logged:</strong> ${formatDateTimeValue(group.latestDefect?.timestamp)}</p>
                </div>
            `;

            const list = document.createElement('div');
            list.className = 'repeating-defects-list';
            group.defects.forEach((defect) => list.appendChild(renderDriverDefectCard(defect)));
            groupCard.appendChild(list);
            driverRepeatingDefectsList.appendChild(groupCard);
        });
    }

    function updateDefectViews() {
        const openDefects = currentAllDefects
            .filter((defect) => !defect.isFixed)
            .sort((a, b) => getDefectTimestampValue(b) - getDefectTimestampValue(a));
        const fixedDefects = currentAllDefects
            .filter((defect) => defect.isFixed)
            .sort((a, b) => getDefectTimestampValue(b) - getDefectTimestampValue(a));

        driverOpenCount.textContent = String(openDefects.length);
        driverOpenFleetCount.textContent = String(new Set(openDefects.map((defect) => String(defect.fleetNumber || ''))).size);
        driverFixedCount.textContent = String(fixedDefects.length);

        currentRepeatingGroups = analyzeRepeatingDefects(
            currentAllDefects,
            parseInt(driverRepeatThreshold.value, 10) || 80
        );
        driverRepeatingCount.textContent = String(currentRepeatingGroups.length);
        driverRepeatingFleetCount.textContent = String(new Set(currentRepeatingGroups.map((group) => String(group.fleetNumber || ''))).size);

        renderDefectFeed(driverOpenDefectsList, openDefects, 'No open defects right now.');
        renderDefectFeed(driverFixedDefectsList, fixedDefects, 'No fixed defects to show yet.');
        renderRepeatingGroups();
    }

    function initializeDefectListener() {
        if (defectsUnsubscribe) defectsUnsubscribe();
        defectsUnsubscribe = db.collection('defects').orderBy('timestamp', 'desc').onSnapshot(async (snapshot) => {
            currentAllDefects = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
            await fetchUserNames(currentAllDefects);
            updateDefectViews();
        }, (error) => {
            console.error('Error loading defects for driver web app:', error);
            driverOpenDefectsList.innerHTML = '<p>Could not load open defects.</p>';
            driverFixedDefectsList.innerHTML = '<p>Could not load fixed defects.</p>';
            driverRepeatingDefectsList.innerHTML = '<p>Could not load repeating defects.</p>';
        });
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
            driverAccountMessage.textContent = 'Your account is approved. Submit new defects or browse current open, fixed, and repeating issues.';
            driverPendingPanel.hidden = true;
            driverRejectedPanel.hidden = true;
            driverFormPanel.hidden = false;
            initializeDefectListener();
            return;
        }

        if (defectsUnsubscribe) {
            defectsUnsubscribe();
            defectsUnsubscribe = null;
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
            if (defectsUnsubscribe) {
                defectsUnsubscribe();
                defectsUnsubscribe = null;
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

    function switchDriverTab(tabName) {
        document.querySelectorAll('.driver-tab-btn').forEach((button) => {
            button.classList.toggle('active', button.dataset.driverTab === tabName);
        });
        document.querySelectorAll('.driver-tab-panel').forEach((panel) => {
            panel.classList.toggle('active', panel.id === `driver-${tabName}-tab`);
        });
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

    document.querySelectorAll('.driver-tab-btn').forEach((button) => {
        button.addEventListener('click', () => switchDriverTab(button.dataset.driverTab));
    });

    driverRepeatThreshold.addEventListener('input', () => {
        driverRepeatThresholdValue.textContent = `${driverRepeatThreshold.value}%`;
        updateDefectViews();
    });

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
        updateDefectViews();
    }).catch((error) => {
        console.error('Error loading driver web app data:', error);
        setFormStatus('Some lookup data could not load. Please refresh the page.', 'error');
    });

    driverAuth.onAuthStateChanged(syncAccessState);
});
