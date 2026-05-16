document.addEventListener('DOMContentLoaded', () => {
    const pendingDefectsList = document.getElementById('pendingDefectsList');
    const pendingUsersList = document.getElementById('pendingUsersList');
    const pendingDefectsCount = document.getElementById('pendingDefectsCount');
    const pendingFleetCount = document.getElementById('pendingFleetCount');
    const pendingUsersCount = document.getElementById('pendingUsersCount');
    const approvalGuidanceModal = document.getElementById('approvalGuidanceModal');
    const approvalGuidanceContent = document.getElementById('approvalGuidanceContent');
    const closeApprovalGuidanceBtn = document.getElementById('closeApprovalGuidanceBtn');
    const approvalGuidanceDoneBtn = document.getElementById('approvalGuidanceDoneBtn');

    let currentPendingDefects = [];
    let currentPendingUsers = [];
    let currentAdminUser = null;

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

    function buildAreaBadgeHtml(item) {
        const area = String(item.locationArea || '').trim();
        const subcategory = String(item.subcategory || '').trim();
        if (!area && !subcategory) {
            return '<span class="detail-chip muted-chip">Area not set</span>';
        }

        const chips = [];
        if (area) chips.push(`<span class="detail-chip">${escapeHtml(area)}</span>`);
        if (subcategory) chips.push(`<span class="detail-chip subtle-chip">${escapeHtml(subcategory)}</span>`);
        return chips.join('');
    }

    function priorityLabel(priority) {
        switch (priority) {
            case 'stop_and_escalate_now': return 'Stop and escalate now';
            case 'engineering_check_recommended': return 'Engineering check recommended';
            case 'continue_and_monitor': return 'Continue and monitor';
            default: return 'Guidance available';
        }
    }

    function severityLabel(severity) {
        switch (severity) {
            case 'possible_dangerous': return 'Possible dangerous';
            case 'possible_major': return 'Possible major';
            case 'possible_minor': return 'Possible minor';
            default: return 'Unclassified';
        }
    }

    function buildDvsaGuidanceHtml(guidance) {
        if (!guidance) return '';
        const referenceLinks = Array.isArray(guidance.sourceReferences) && guidance.sourceReferences.length > 0
            ? guidance.sourceReferences.map((reference) => `<a href="${reference.url}" target="_blank" rel="noopener noreferrer">${escapeHtml(reference.title || reference.url)}</a>`).join(' | ')
            : 'No source reference attached';
        return `
            <div class="dvsa-guidance-card">
                <div class="dvsa-guidance-topline">
                    <strong>AI DVSA Guidance</strong>
                    <span class="detail-chip subtle-chip">${escapeHtml(priorityLabel(guidance.priority))}</span>
                    <span class="detail-chip muted-chip">${escapeHtml(severityLabel(guidance.severity))}</span>
                </div>
                <p><strong>Section:</strong> ${escapeHtml(guidance.handbookSection || 'Manual review')}</p>
                <p><strong>Why:</strong> ${escapeHtml(guidance.summary || guidance.why || 'No explanation available.')}</p>
                <p><strong>Reference:</strong> ${referenceLinks}</p>
                <p class="dvsa-guidance-disclaimer">${escapeHtml(guidance.disclaimer || 'Guidance only. Final decision rests with engineering or management.')}</p>
            </div>
        `;
    }

    function openApprovalGuidanceModal(defect) {
        const guidance = defect.dvsaGuidance || buildClientDvsaGuidance(defect);
        approvalGuidanceContent.innerHTML = buildDvsaGuidanceHtml(guidance);
        approvalGuidanceModal.hidden = false;
    }

    function closeApprovalGuidanceModal() {
        approvalGuidanceModal.hidden = true;
        approvalGuidanceContent.innerHTML = '';
    }

    function updateStats() {
        pendingDefectsCount.textContent = String(currentPendingDefects.length);
        pendingFleetCount.textContent = String(new Set(currentPendingDefects.map((defect) => String(defect.fleetNumber || ''))).size);
        pendingUsersCount.textContent = String(currentPendingUsers.length);
    }

    function renderPendingDefects() {
        updateStats();
        pendingDefectsList.innerHTML = '';

        if (currentPendingDefects.length === 0) {
            pendingDefectsList.innerHTML = '<p>No driver defects are waiting for approval.</p>';
            return;
        }

        currentPendingDefects.forEach((defect) => {
            const item = document.createElement('div');
            item.className = 'defect-item pending-defect';
            item.dataset.id = defect.id;

            const imageUrls = Array.isArray(defect.imageUrls) ? defect.imageUrls : [];
            const imagesHtml = imageUrls.length > 0
                ? `<div class="defect-image-display">${imageUrls.map((url) => `<a href="${url}" target="_blank" rel="noopener noreferrer"><img src="${url}" alt="Pending defect image" class="defect-image" loading="lazy"></a>`).join('')}</div>`
                : '';

            item.innerHTML = `
                <div class="defect-card-topline">
                    <div>
                        <div class="defect-card-title">Fleet ${escapeHtml(defect.fleetNumber || 'N/A')}</div>
                        <div class="defect-card-subtitle">${escapeHtml(defect.busType || getVehicleTypeForFleetNumber(defect.fleetNumber) || 'Unknown')}</div>
                    </div>
                    <div class="defect-card-status status-open">Waiting Approval</div>
                </div>
                <div class="detail-chip-row">
                    ${buildAreaBadgeHtml(defect)}
                    <span class="detail-chip muted-chip">Submitted by ${escapeHtml(defect.submittedByName || 'Unknown')}</span>
                </div>
                <p><strong>Defect:</strong> ${escapeHtml(defect.description || 'N/A')}</p>
                <p><strong>Submitted On:</strong> ${formatDateTimeValue(defect.timestamp)}</p>
                ${imagesHtml}
                <div class="actions">
                    <button class="guidance-btn" data-id="${defect.id}">DVSA Guidance</button>
                    <button class="approve-btn" data-id="${defect.id}">Approve Defect</button>
                    <button class="delete-btn" data-id="${defect.id}">Reject / Delete</button>
                </div>
            `;
            pendingDefectsList.appendChild(item);
        });
    }

    function renderPendingUsers() {
        updateStats();
        pendingUsersList.innerHTML = '';

        if (currentPendingUsers.length === 0) {
            pendingUsersList.innerHTML = '<p>No driver accounts are waiting for approval.</p>';
            return;
        }

        currentPendingUsers.forEach((user) => {
            const item = document.createElement('div');
            item.className = 'approval-user-card';
            item.dataset.id = user.uid;
            item.innerHTML = `
                <div class="approval-user-head">
                    <div>
                        <h3>${escapeHtml(user.displayName || 'Unknown')}</h3>
                        <p>${escapeHtml(user.email || 'No email')}</p>
                    </div>
                    <span class="driver-status-badge pending">Pending</span>
                </div>
                <p><strong>Created:</strong> ${formatDateTimeValue(user.createdAt?.toDate ? user.createdAt.toDate().toISOString() : user.createdAt)}</p>
                <div class="actions">
                    <button class="approve-btn" data-id="${user.uid}">Approve User</button>
                    <button class="delete-btn" data-id="${user.uid}">Reject User</button>
                </div>
            `;
            pendingUsersList.appendChild(item);
        });
    }

    async function approvePendingDefect(defectId) {
        const pending = currentPendingDefects.find((item) => item.id === defectId);
        if (!pending || !currentAdminUser) return;

        const approverName = currentAdminUser.displayName || currentAdminUser.email || 'Unknown';
        const approvalComment = {
            text: `Driver report submitted by ${pending.submittedByName || 'Unknown'} approved by ${approverName}.`,
            user: approverName,
            timestamp: new Date().toISOString()
        };

        const approvedRef = db.collection('defects').doc();
        const pendingRef = db.collection('pendingDefects').doc(defectId);

        const guidance = pending.dvsaGuidance || buildClientDvsaGuidance(pending);
        await db.runBatch((batch) => {
            batch.set(approvedRef, {
                fleetNumber: pending.fleetNumber,
                busType: pending.busType || getVehicleTypeForFleetNumber(pending.fleetNumber) || '',
                locationArea: pending.locationArea || '',
                subcategory: pending.subcategory || '',
                description: pending.description || '',
                timestamp: pending.timestamp || new Date().toISOString(),
                isFixed: false,
                loggedInUser: currentAdminUser.uid,
                userName: approverName,
                comments: [approvalComment],
                imageUrls: Array.isArray(pending.imageUrls) ? pending.imageUrls : [],
                dvsaGuidance: guidance,
                priority: guidance.priority,
                dvsaSeverity: guidance.severity,
                reportedByUid: pending.submittedByUid || '',
                reportedByName: pending.submittedByName || '',
                approvedByUid: currentAdminUser.uid,
                approvedByName: approverName,
                approvedAt: new Date().toISOString(),
                source: 'driver'
            });
            batch.delete(pendingRef);
        });
    }

    async function rejectPendingDefect(defectId) {
        await db.collection('pendingDefects').doc(defectId).delete();
    }

    async function updateUserApprovalStatus(uid, status) {
        await db.collection('users').doc(uid).set({
            status,
            role: 'driver',
            updatedAt: new Date().toISOString()
        }, { merge: true });
    }

    function initializeListeners() {
        db.collection('pendingDefects').orderBy('timestamp', 'desc').onSnapshot((snapshot) => {
            currentPendingDefects = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
            renderPendingDefects();
        }, (error) => {
            console.error('Error loading pending defects:', error);
            pendingDefectsList.innerHTML = '<p>Could not load pending defects.</p>';
        });

        db.collection('users').where('status', '==', 'pending').onSnapshot((snapshot) => {
            currentPendingUsers = snapshot.docs.map((doc) => ({ uid: doc.id, ...doc.data() }));
            renderPendingUsers();
        }, (error) => {
            console.error('Error loading pending users:', error);
            pendingUsersList.innerHTML = '<p>Could not load pending users.</p>';
        });
    }

    pendingDefectsList.addEventListener('click', async (event) => {
        const target = event.target;
        const defectId = target.dataset.id;
        if (!defectId) return;

        try {
            if (target.classList.contains('guidance-btn')) {
                const defect = currentPendingDefects.find((item) => item.id === defectId);
                if (defect) openApprovalGuidanceModal(defect);
                return;
            }
            if (target.classList.contains('approve-btn')) {
                await approvePendingDefect(defectId);
            }
            if (target.classList.contains('delete-btn')) {
                if (confirm('Delete this pending defect report?')) {
                    await rejectPendingDefect(defectId);
                }
            }
        } catch (error) {
            console.error('Pending defect action failed:', error);
            alert('That defect action could not be completed.');
        }
    });

    pendingUsersList.addEventListener('click', async (event) => {
        const target = event.target;
        const uid = target.dataset.id;
        if (!uid) return;

        try {
            if (target.classList.contains('approve-btn')) {
                await updateUserApprovalStatus(uid, 'approved');
            }
            if (target.classList.contains('delete-btn')) {
                await updateUserApprovalStatus(uid, 'rejected');
            }
        } catch (error) {
            console.error('Pending user action failed:', error);
            alert('That user action could not be completed.');
        }
    });

    document.querySelectorAll('.tab-btn').forEach((button) => {
        button.addEventListener('click', () => {
            const tabName = button.dataset.tab;
            document.querySelectorAll('.tab-btn').forEach((btn) => btn.classList.remove('active'));
            button.classList.add('active');
            document.querySelectorAll('.tab-content').forEach((content) => content.classList.remove('active'));
            document.getElementById(`${tabName}-tab`).classList.add('active');
        });
    });
    closeApprovalGuidanceBtn.addEventListener('click', closeApprovalGuidanceModal);
    approvalGuidanceDoneBtn.addEventListener('click', closeApprovalGuidanceModal);
    approvalGuidanceModal.addEventListener('click', (event) => {
        if (event.target.dataset.closeApprovalGuidance === 'true') {
            closeApprovalGuidanceModal();
        }
    });

    auth.onAuthStateChanged(async (user) => {
        if (!user) return;
        if (!ADMIN_UIDS.includes(user.uid)) {
            alert('This page is restricted to administrators.');
            window.location.href = './index.html';
            return;
        }

        currentAdminUser = user;
        await loadCustomFleetVehicles();
        initializeListeners();
    });
});
