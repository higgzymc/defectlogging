document.addEventListener('DOMContentLoaded', () => {
    const defectsListDiv = document.getElementById('defectsList');
    const repeatingDefectsListDiv = document.getElementById('repeatingDefectsList');
    const searchFleetNumberInput = document.getElementById('searchFleetNumber');
    const searchDescriptionInput = document.getElementById('searchDescription');
    const statusSelect = document.getElementById('statusSelect');
    const sortBySelect = document.getElementById('sortBySelect');
    const fromDayInput = document.getElementById('fromDayInput');
    const toDayInput = document.getElementById('toDayInput');
    const applyFiltersBtn = document.getElementById('applyFiltersBtn');
    const clearAllFiltersBtn = document.getElementById('clearAllFiltersBtn');
    const downloadXlsxBtn = document.getElementById('downloadXlsxBtn');
    const refreshGuidanceBtn = document.getElementById('refreshGuidanceBtn');
    const totalDefectsCountSpan = document.getElementById('totalDefectsCount');
    const activeDefectsCountSpan = document.getElementById('activeDefectsCount');
    const fixedDefectsCountSpan = document.getElementById('fixedDefectsCount');
    const repeatingFleetFilterInput = document.getElementById('repeatingFleetFilter');
    const repeatingDescriptionFilterInput = document.getElementById('repeatingDescriptionFilter');
    const repeatingStatusFilterSelect = document.getElementById('repeatingStatusFilter');
    const minOccurrencesFilterInput = document.getElementById('minOccurrencesFilter');
    const similarityThresholdInput = document.getElementById('similarityThreshold');
    const similarityValueSpan = document.getElementById('similarityValue');
    const clearRepeatingFiltersBtn = document.getElementById('clearRepeatingFiltersBtn');
    const downloadRepeatingReportBtn = document.getElementById('downloadRepeatingReportBtn');
    const repeatingGroupsCountSpan = document.getElementById('repeatingGroupsCount');
    const activeRepeatingGroupsCountSpan = document.getElementById('activeRepeatingGroupsCount');
    const repeatingFleetCountSpan = document.getElementById('repeatingFleetCount');
    const allDefectsFilterSummary = document.getElementById('allDefectsFilterSummary');
    const repeatingDefectsFilterSummary = document.getElementById('repeatingDefectsFilterSummary');
    const quickFilterButtons = document.querySelectorAll('.quick-filter-btn');

    let currentAllDefects = [];
    let currentRepeatingGroups = [];
    let userDisplayNames = {};
    let currentTab = 'all-defects';

    function initializeFirestoreListener() {
        db.collection('defects').orderBy('timestamp', 'desc').onSnapshot(async (snapshot) => {
            currentAllDefects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            await fetchUserNames(currentAllDefects);
            updateDisplay();
        }, (error) => {
            console.error('Error fetching defects: ', error);
            defectsListDiv.innerHTML = '<p>Could not load defects. Please check your connection and refresh.</p>';
            repeatingDefectsListDiv.innerHTML = '<p>Could not load repeating defects. Please check your connection and refresh.</p>';
        });
    }

    auth.onAuthStateChanged(async user => {
        if (user) {
            if (refreshGuidanceBtn) {
                refreshGuidanceBtn.hidden = !ADMIN_UIDS.includes(user.uid);
            }
            await Promise.all([loadCustomFleetVehicles(), loadDefectCategories()]);
            initializeFirestoreListener();
        }
    });

    async function fetchUserNames(defects) {
        const userIds = [...new Set(defects.map(d => d.loggedInUser).filter(uid => uid && !userDisplayNames[uid]))];
        if (userIds.length === 0) return;
        for (const uid of userIds) {
            userDisplayNames[uid] = await getDisplayNameForUser(uid);
        }
    }

    function getCurrentFilters() {
        return {
            fleet: searchFleetNumberInput.value,
            description: searchDescriptionInput.value,
            status: statusSelect.value,
            fromDay: fromDayInput.value,
            toDay: toDayInput.value,
            sort: sortBySelect.value
        };
    }

    function getCurrentRepeatingFilters() {
        return {
            fleet: repeatingFleetFilterInput.value,
            description: repeatingDescriptionFilterInput.value,
            status: repeatingStatusFilterSelect.value,
            minOccurrences: parseInt(minOccurrencesFilterInput.value, 10) || 2,
            similarityThreshold: parseInt(similarityThresholdInput.value, 10) || 80
        };
    }

    function buildAreaLabel(defect) {
        const parts = [defect.locationArea, defect.subcategory].map(value => String(value || '').trim()).filter(Boolean);
        return parts.length > 0 ? parts.join(' / ') : 'Not set';
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

    function buildDvsaGuidanceHtml(defect) {
        const guidance = defect.dvsaGuidance || (typeof buildClientDvsaGuidance === 'function' ? buildClientDvsaGuidance(defect) : null);
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
                <p><strong>Confidence:</strong> ${escapeHtml((guidance.confidence || 'low').toUpperCase())}</p>
                <p><strong>Reference:</strong> ${referenceLinks}</p>
                <p class="dvsa-guidance-disclaimer">${escapeHtml(guidance.disclaimer || 'Guidance only. Final decision rests with engineering or management.')}</p>
            </div>
        `;
    }

    function defectPatternText(defect) {
        return [defect.locationArea, defect.subcategory, defect.description]
            .map(value => String(value || '').trim())
            .filter(Boolean)
            .join(' - ');
    }

    function updateDisplay() {
        const total = currentAllDefects.length;
        const active = currentAllDefects.filter(d => !d.isFixed).length;
        const fixed = total - active;

        totalDefectsCountSpan.textContent = total;
        activeDefectsCountSpan.textContent = active;
        fixedDefectsCountSpan.textContent = fixed;

        const repeatingFilters = getCurrentRepeatingFilters();
        currentRepeatingGroups = analyzeRepeatingDefects(currentAllDefects, repeatingFilters.similarityThreshold);
        updateRepeatingSummary();

        renderDefects(getCurrentFilters());
        renderRepeatingDefects(repeatingFilters);
    }

    if (refreshGuidanceBtn) {
        refreshGuidanceBtn.addEventListener('click', async () => {
            refreshGuidanceBtn.disabled = true;
            const originalLabel = refreshGuidanceBtn.textContent;
            refreshGuidanceBtn.textContent = 'Refreshing AI Guidance...';

            try {
                const result = await reassessOutstandingDvsaGuidance({ limit: 75, overwrite: true });
                const suffix = result.usedAi ? 'using AI' : 'using rules fallback';
                refreshGuidanceBtn.textContent = `Updated ${result.updated || 0} defects`;
                window.setTimeout(() => {
                    refreshGuidanceBtn.textContent = `${originalLabel} (${suffix})`;
                }, 2500);
            } catch (error) {
                console.error('Could not refresh AI guidance:', error);
                refreshGuidanceBtn.textContent = 'Refresh AI Guidance';
                window.alert(error.message || 'Could not refresh AI guidance right now.');
            } finally {
                refreshGuidanceBtn.disabled = false;
            }
        });
    }

    function renderDefects(filters) {
        let defectsToRender = [...currentAllDefects];
        const currentUser = auth.currentUser;
        const isAdmin = currentUser && ADMIN_UIDS.includes(currentUser.uid);

        if (filters.fleet.trim() !== '') {
            defectsToRender = defectsToRender.filter(d =>
                String(d.fleetNumber || '').toLowerCase().includes(filters.fleet.trim().toLowerCase())
            );
        }
        if (filters.description.trim() !== '') {
            defectsToRender = defectsToRender.filter(d =>
                String(d.description || '').toLowerCase().includes(filters.description.trim().toLowerCase())
            );
        }
        if (filters.status !== 'all') {
            defectsToRender = defectsToRender.filter(d => {
                if (filters.status === 'fixed') return d.isFixed;
                if (filters.status === 'unfixed') return !d.isFixed;
                return true;
            });
        }
        if (filters.fromDay || filters.toDay) {
            const fromDate = filters.fromDay ? new Date(filters.fromDay).getTime() : 0;
            const toDate = filters.toDay ? new Date(filters.toDay).getTime() + 86400000 : Infinity;
            defectsToRender = defectsToRender.filter(d => {
                const ts = new Date(d.timestamp).getTime();
                return ts >= fromDate && ts < toDate;
            });
        }

        defectsToRender.sort((a, b) => {
            if (a.isFixed && !b.isFixed) return 1;
            if (!a.isFixed && b.isFixed) return -1;
            switch (filters.sort) {
                case 'oldest': return new Date(a.timestamp) - new Date(b.timestamp);
                case 'fleetAsc': return (parseInt(a.fleetNumber, 10) || 0) - (parseInt(b.fleetNumber, 10) || 0);
                case 'fleetDesc': return (parseInt(b.fleetNumber, 10) || 0) - (parseInt(a.fleetNumber, 10) || 0);
                default: return new Date(b.timestamp) - new Date(a.timestamp);
            }
        });

        defectsListDiv.innerHTML = '';
        updateAllDefectsFilterSummary(filters, defectsToRender.length);
        if (defectsToRender.length === 0) {
            defectsListDiv.innerHTML = '<p>No defects found matching your criteria.</p>';
            return;
        }

        defectsToRender.forEach(defect => {
            const defectItem = document.createElement('div');
            defectItem.classList.add('defect-item');
            defectItem.dataset.id = defect.id;

            if (defect.isFixed) {
                defectItem.classList.add('fixed-defect');
            } else {
                const ageInDays = (new Date() - new Date(defect.timestamp)) / (1000 * 60 * 60 * 24);
                if (ageInDays >= 28) defectItem.classList.add('red-defect');
                else if (ageInDays >= 14) defectItem.classList.add('amber-defect');
            }

            const loggedByName = userDisplayNames[defect.loggedInUser] || 'Loading...';
            const busType = getDefectBusType(defect);
            const statusText = defect.isFixed ? 'Fixed' : 'Outstanding';
            const deleteButtonHtml = isAdmin ? `<button class="delete-btn" data-id="${defect.id}">Delete</button>` : '';
            const markFixedButtonHtml = !defect.isFixed ? `<button class="mark-fixed-btn" data-id="${defect.id}">Mark as Fixed</button>` : '';

            let commentsHtml = '';
            if (defect.comments && defect.comments.length > 0) {
                commentsHtml = '<h4>Comments:</h4>';
                const sortedComments = [...defect.comments].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
                commentsHtml += sortedComments.map(comment => `
                    <div class="comment-item">
                        <span>${comment.user} on ${new Date(comment.timestamp).toLocaleString()}:</span>
                        ${comment.text}
                    </div>
                `).join('');
            }

            let imagesHtml = '';
            if (defect.imageUrls && defect.imageUrls.length > 0) {
                imagesHtml = `<div class="defect-image-display">${defect.imageUrls.map(url =>
                    `<a href="${url}" target="_blank" rel="noopener noreferrer"><img src="${url}" alt="Defect Image" class="defect-image" loading="lazy"></a>`
                ).join('')}</div>`;
            }

            defectItem.innerHTML = `
                <div class="defect-card-topline">
                    <div>
                        <div class="defect-card-title">Fleet ${escapeHtml(defect.fleetNumber || 'N/A')}</div>
                        <div class="defect-card-subtitle">${escapeHtml(busType || 'Unknown')}</div>
                    </div>
                    <div class="defect-card-status ${defect.isFixed ? 'status-fixed' : 'status-open'}">${statusText}</div>
                </div>
                <div class="detail-chip-row">
                    ${buildAreaBadgeHtml(defect)}
                </div>
                <p><strong>Defect:</strong> ${escapeHtml(defect.description || 'N/A')}</p>
                ${buildDvsaGuidanceHtml(defect)}
                <p><strong>Logged By:</strong> ${loggedByName}</p>
                <p><strong>Logged On:</strong> ${new Date(defect.timestamp).toLocaleString()}</p>
                ${imagesHtml}
                <div class="comments-container">
                    ${commentsHtml}
                    <div class="comment-input-area">
                        <input type="text" class="new-comment-input" placeholder="Add a comment...">
                        <button class="add-comment-btn" data-id="${defect.id}">Add Comment</button>
                    </div>
                </div>
                <div class="actions">
                    ${markFixedButtonHtml}
                    ${deleteButtonHtml}
                </div>
            `;
            defectsListDiv.appendChild(defectItem);
        });
    }

    function updateRepeatingSummary() {
        repeatingGroupsCountSpan.textContent = currentRepeatingGroups.length;
        activeRepeatingGroupsCountSpan.textContent = currentRepeatingGroups.filter(group => group.hasOutstandingDefect).length;
        repeatingFleetCountSpan.textContent = new Set(currentRepeatingGroups.map(group => String(group.fleetNumber))).size;
    }

    function renderRepeatingDefects(filters) {
        let repeatingGroups = [...currentRepeatingGroups];

        if (filters.fleet.trim() !== '') {
            repeatingGroups = repeatingGroups.filter(group =>
                String(group.fleetNumber || '').toLowerCase().includes(filters.fleet.trim().toLowerCase())
            );
        }
        if (filters.description.trim() !== '') {
            repeatingGroups = repeatingGroups.filter(group =>
                String(group.description || '').toLowerCase().includes(filters.description.trim().toLowerCase())
            );
        }

        if (filters.status !== 'all') {
            repeatingGroups = repeatingGroups.filter(group => {
                if (filters.status === 'unfixed') return group.hasOutstandingDefect;
                if (filters.status === 'fixed') return group.latestStatusIsFixed;
                return true;
            });
        }

        if (filters.minOccurrences > 2) {
            repeatingGroups = repeatingGroups.filter(group => group.count >= filters.minOccurrences);
        }

        repeatingGroups.sort((a, b) => {
            if (b.count !== a.count) return b.count - a.count;
            return getDefectTimestampValue(b.latestDefect) - getDefectTimestampValue(a.latestDefect);
        });

        repeatingDefectsListDiv.innerHTML = '';
        updateRepeatingFilterSummary(filters, repeatingGroups.length);
        if (repeatingGroups.length === 0) {
            repeatingDefectsListDiv.innerHTML = '<p>No repeating defects found matching your criteria.</p>';
            return;
        }

        repeatingGroups.forEach(group => {
            const groupContainer = document.createElement('div');
            groupContainer.classList.add('repeating-group');

            const header = document.createElement('div');
            header.classList.add('repeating-group-header');
            const groupBusType = getVehicleTypeForFleetNumber(group.fleetNumber);
                header.innerHTML = `
                <h3>Fleet ${group.fleetNumber} - ${group.count} similar issues</h3>
                <p><strong>Vehicle Type:</strong> ${escapeHtml(groupBusType || 'Unknown')}</p>
                <p><strong>Pattern:</strong> ${escapeHtml(group.description || 'N/A')}</p>
                <p><strong>Similarity:</strong> ${group.similarity}%</p>
                <p><strong>Latest status:</strong> ${group.latestStatusIsFixed ? 'Fixed' : 'Outstanding'}</p>
                <p><strong>Last logged:</strong> ${formatDateTimeValue(group.latestDefect?.timestamp)}</p>
            `;
            groupContainer.appendChild(header);

            const defectItemsContainer = document.createElement('div');
            defectItemsContainer.classList.add('repeating-defects-list');

            group.defects.forEach(defect => {
                const defectItem = document.createElement('div');
                defectItem.classList.add('defect-item', 'repeating-defect-item');
                if (defect.isFixed) {
                    defectItem.classList.add('fixed-defect');
                }

                const commentSummary = formatCommentsForReport(defect.comments);
                defectItem.innerHTML = `
                    <div class="detail-chip-row">
                        ${buildAreaBadgeHtml(defect)}
                    </div>
                    <p><strong>Description:</strong> ${escapeHtml(defect.description || 'N/A')}</p>
                    ${buildDvsaGuidanceHtml(defect)}
                    <p><strong>Status:</strong> ${defect.isFixed ? 'Fixed' : 'Outstanding'}</p>
                    <p><strong>Logged By:</strong> ${escapeHtml(userDisplayNames[defect.loggedInUser] || 'Unknown')}</p>
                    <p><strong>Logged On:</strong> ${formatDateTimeValue(defect.timestamp)}</p>
                    <p><strong>Comments:</strong> ${escapeHtml(commentSummary)}</p>
                `;
                defectItemsContainer.appendChild(defectItem);
            });

            groupContainer.appendChild(defectItemsContainer);
            repeatingDefectsListDiv.appendChild(groupContainer);
        });
    }

    function levenshteinDistance(str1, str2) {
        const track = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

        for (let i = 0; i <= str1.length; i += 1) {
            track[0][i] = i;
        }
        for (let j = 0; j <= str2.length; j += 1) {
            track[j][0] = j;
        }

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

        defects.forEach(defect => {
            const fleetNumber = defect.fleetNumber || 'Unknown';
            if (!groupedByFleet[fleetNumber]) {
                groupedByFleet[fleetNumber] = [];
            }
            groupedByFleet[fleetNumber].push(defect);
        });

        const repeatingGroups = [];

        Object.keys(groupedByFleet).forEach(fleetNumber => {
            const fleetDefects = groupedByFleet[fleetNumber];
            if (fleetDefects.length < 2) return;

            const clusters = [];

            fleetDefects.forEach(defect => {
                let matchedCluster = null;
                for (const cluster of clusters) {
                    const similarity = calculateSimilarity(defectPatternText(defect), defectPatternText(cluster[0]));
                    if (similarity >= similarityThreshold) {
                        matchedCluster = cluster;
                        break;
                    }
                }

                if (matchedCluster) {
                    matchedCluster.push(defect);
                } else {
                    clusters.push([defect]);
                }
            });

            clusters.forEach(cluster => {
                if (cluster.length < 2) return;

                const sortedCluster = [...cluster].sort((a, b) => getDefectTimestampValue(a) - getDefectTimestampValue(b));
                const hasOutstandingDefect = sortedCluster.some(defect => !defect.isFixed);
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

    function formatDateTimeValue(value) {
        if (!value) return 'N/A';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return 'N/A';
        return date.toLocaleString('en-GB');
    }

    function formatDateLabel(value) {
        if (!value) return '';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '';
        return date.toLocaleDateString('en-GB');
    }

    function updateAllDefectsFilterSummary(filters, resultsCount) {
        const parts = [];
        if (filters.fleet.trim()) parts.push(`Fleet ${filters.fleet.trim()}`);
        if (filters.description.trim()) parts.push(`Description "${filters.description.trim()}"`);
        if (filters.status !== 'all') parts.push(filters.status === 'fixed' ? 'Fixed only' : 'Outstanding only');
        if (filters.fromDay) parts.push(`From ${formatDateLabel(filters.fromDay)}`);
        if (filters.toDay) parts.push(`To ${formatDateLabel(filters.toDay)}`);

        allDefectsFilterSummary.textContent = parts.length > 0
            ? `${resultsCount} result${resultsCount === 1 ? '' : 's'} | ${parts.join(' | ')}`
            : `Showing all defects (${resultsCount})`;
    }

    function updateRepeatingFilterSummary(filters, resultsCount) {
        const parts = [];
        if (filters.fleet.trim()) parts.push(`Fleet ${filters.fleet.trim()}`);
        if (filters.description.trim()) parts.push(`Pattern "${filters.description.trim()}"`);
        if (filters.status !== 'all') parts.push(filters.status === 'fixed' ? 'Latest marked fixed' : 'Has outstanding defect');
        if (filters.minOccurrences > 2) parts.push(`Min ${filters.minOccurrences} occurrences`);
        parts.push(`Similarity ${filters.similarityThreshold}%`);

        repeatingDefectsFilterSummary.textContent = `${resultsCount} repeat group${resultsCount === 1 ? '' : 's'} | ${parts.join(' | ')}`;
    }

    function setQuickDateRange(range) {
        const today = new Date();
        const formatForInput = (date) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        if (range === 'clear') {
            fromDayInput.value = '';
            toDayInput.value = '';
            renderDefects(getCurrentFilters());
            return;
        }

        if (range === 'today') {
            const todayValue = formatForInput(today);
            fromDayInput.value = todayValue;
            toDayInput.value = todayValue;
            renderDefects(getCurrentFilters());
            return;
        }

        const days = parseInt(range, 10);
        if (!Number.isNaN(days)) {
            const fromDate = new Date(today);
            fromDate.setDate(today.getDate() - (days - 1));
            fromDayInput.value = formatForInput(fromDate);
            toDayInput.value = formatForInput(today);
            renderDefects(getCurrentFilters());
        }
    }

    function formatCommentsForReport(comments) {
        if (!comments || comments.length === 0) {
            return 'No comments';
        }

        return comments.map(comment => {
            const commentText = comment.text ? String(comment.text).trim() : 'No comment text';
            const commentUser = comment.user ? String(comment.user).trim() : 'Unknown';
            const commentTime = comment.timestamp ? formatDateTimeValue(comment.timestamp) : 'Unknown time';
            return `${commentText} (${commentUser}, ${commentTime})`;
        }).join(' | ');
    }

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function getDefectBusType(defect) {
        return defect.busType || getVehicleTypeForFleetNumber(defect.fleetNumber);
    }

    async function generateRepeatingDefectsReport() {
        if (!window.jspdf || !window.jspdf.jsPDF) {
            alert('The PDF library did not load, so the report cannot be downloaded right now.');
            return;
        }

        const filters = getCurrentRepeatingFilters();
        let repeatingGroups = [...currentRepeatingGroups];

        if (filters.fleet.trim() !== '') {
            repeatingGroups = repeatingGroups.filter(group =>
                String(group.fleetNumber || '').toLowerCase().includes(filters.fleet.trim().toLowerCase())
            );
        }
        if (filters.status !== 'all') {
            repeatingGroups = repeatingGroups.filter(group => {
                if (filters.status === 'unfixed') return group.hasOutstandingDefect;
                if (filters.status === 'fixed') return group.latestStatusIsFixed;
                return true;
            });
        }
        if (filters.minOccurrences > 2) {
            repeatingGroups = repeatingGroups.filter(group => group.count >= filters.minOccurrences);
        }

        if (repeatingGroups.length === 0) {
            alert('No repeating defects match the current filters.');
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const primaryColor = [41, 128, 185];
        const secondaryColor = [231, 76, 60];
        const textColor = [52, 73, 94];

        doc.setProperties({
            title: 'Repeating Defects Report',
            subject: 'Bus Defect Logger Repeat Analysis',
            author: 'Bus Defect Logger',
            creator: 'Bus Defect Logger'
        });

        let yPosition = 20;
        doc.setFontSize(22);
        doc.setTextColor(...primaryColor);
        doc.text('Repeating Defects Report', 20, yPosition);
        yPosition += 12;

        doc.setFontSize(10);
        doc.setTextColor(...textColor);
        doc.text(`Generated: ${formatDateTimeValue(new Date().toISOString())}`, 20, yPosition);
        yPosition += 6;
        doc.text(`Repeat groups: ${repeatingGroups.length}`, 20, yPosition);
        yPosition += 6;
        doc.text(`Similarity threshold: ${filters.similarityThreshold}%`, 20, yPosition);
        yPosition += 10;

            const summaryRows = repeatingGroups.map(group => [
                `Fleet ${group.fleetNumber}`,
                getVehicleTypeForFleetNumber(group.fleetNumber) || 'Unknown',
                group.count,
                group.latestStatusIsFixed ? 'Fixed' : 'Outstanding',
                formatDateTimeValue(group.latestDefect?.timestamp),
                group.description.length > 45 ? `${group.description.slice(0, 45)}...` : group.description
            ]);

        doc.autoTable({
            startY: yPosition,
            head: [['Fleet', 'Vehicle Type', 'Occurrences', 'Latest Status', 'Last Logged', 'Pattern']],
            body: summaryRows,
            theme: 'grid',
            headStyles: { fillColor: primaryColor, textColor: 255 },
            styles: { fontSize: 8 }
        });

        yPosition = doc.lastAutoTable.finalY + 10;

        repeatingGroups.forEach((group, index) => {
            if (yPosition > 220) {
                doc.addPage();
                yPosition = 20;
            }

            doc.setFontSize(14);
            doc.setTextColor(...secondaryColor);
            doc.text(`Critical Issue #${index + 1}: Fleet ${group.fleetNumber}`, 20, yPosition);
            yPosition += 8;

            doc.setFontSize(10);
            doc.setTextColor(...textColor);
            doc.text(`Vehicle Type: ${getVehicleTypeForFleetNumber(group.fleetNumber) || 'Unknown'}`, 20, yPosition);
            yPosition += 6;
            doc.text(`Pattern: ${group.description}`, 20, yPosition);
            yPosition += 6;
            doc.text(`Occurrences: ${group.count} | Similarity: ${group.similarity}%`, 20, yPosition);
            yPosition += 8;

            const defectRows = group.defects.map(defect => [
                formatDateTimeValue(defect.timestamp),
                defect.isFixed ? 'Fixed' : 'Outstanding',
                userDisplayNames[defect.loggedInUser] || 'Unknown',
                buildAreaLabel(defect),
                formatCommentsForReport(defect.comments)
            ]);

            doc.autoTable({
                startY: yPosition,
                head: [['Logged On', 'Status', 'Logged By', 'Area', 'Comments']],
                body: defectRows,
                theme: 'striped',
                headStyles: { fillColor: [149, 165, 166], textColor: 255 },
                styles: { fontSize: 7, cellPadding: 2 },
                columnStyles: {
                    0: { cellWidth: 34 },
                    1: { cellWidth: 22 },
                    2: { cellWidth: 28 },
                    3: { cellWidth: 32 },
                    4: { cellWidth: 67 }
                }
            });

            yPosition = doc.lastAutoTable.finalY + 10;
        });

        const fileName = `repeating_defects_report_${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(fileName);
    }

    defectsListDiv.addEventListener('click', async (event) => {
        const target = event.target;
        const defectId = target.dataset.id;
        if (!defectId) return;

        if (target.classList.contains('mark-fixed-btn')) {
            await db.collection('defects').doc(defectId).update({ isFixed: true });
        } else if (target.classList.contains('delete-btn')) {
            if (confirm('Are you sure you want to permanently delete this defect?')) {
                await db.collection('defects').doc(defectId).delete();
            }
        } else if (target.classList.contains('add-comment-btn')) {
            const commentInput = target.previousElementSibling;
            const commentText = commentInput.value.trim();
            const loggedInUser = auth.currentUser;

            if (!loggedInUser) {
                alert('You must be logged in to add comments.');
                return;
            }
            if (commentText === '') {
                alert('Comment cannot be empty.');
                return;
            }

            const newComment = {
                text: commentText,
                user: loggedInUser.displayName || loggedInUser.email,
                timestamp: new Date().toISOString()
            };

            try {
                await db.collection('defects').doc(defectId).update({
                    comments: firebase.firestore.FieldValue.arrayUnion(newComment)
                });
                commentInput.value = '';
            } catch (error) {
                console.error('Error adding comment:', error);
                alert('Failed to add comment.');
            }
        }
    });

    applyFiltersBtn.addEventListener('click', () => renderDefects(getCurrentFilters()));
    searchFleetNumberInput.addEventListener('input', () => renderDefects(getCurrentFilters()));
    searchDescriptionInput.addEventListener('input', () => renderDefects(getCurrentFilters()));
    statusSelect.addEventListener('change', () => renderDefects(getCurrentFilters()));
    fromDayInput.addEventListener('change', () => renderDefects(getCurrentFilters()));
    toDayInput.addEventListener('change', () => renderDefects(getCurrentFilters()));
    sortBySelect.addEventListener('change', () => renderDefects(getCurrentFilters()));
    clearAllFiltersBtn.addEventListener('click', () => {
        searchFleetNumberInput.value = '';
        searchDescriptionInput.value = '';
        statusSelect.value = 'all';
        fromDayInput.value = '';
        toDayInput.value = '';
        sortBySelect.value = 'newest';
        renderDefects(getCurrentFilters());
    });

    document.querySelectorAll('.tab-btn').forEach(button => {
        button.addEventListener('click', () => {
            currentTab = button.dataset.tab;
            document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
            document.getElementById(`${currentTab}-tab`).classList.add('active');
        });
    });

    similarityThresholdInput.addEventListener('input', () => {
        similarityValueSpan.textContent = `${similarityThresholdInput.value}%`;
        updateDisplay();
    });

    repeatingFleetFilterInput.addEventListener('input', () => renderRepeatingDefects(getCurrentRepeatingFilters()));
    repeatingDescriptionFilterInput.addEventListener('input', () => renderRepeatingDefects(getCurrentRepeatingFilters()));
    repeatingStatusFilterSelect.addEventListener('change', () => renderRepeatingDefects(getCurrentRepeatingFilters()));
    minOccurrencesFilterInput.addEventListener('input', () => renderRepeatingDefects(getCurrentRepeatingFilters()));

    clearRepeatingFiltersBtn.addEventListener('click', () => {
        repeatingFleetFilterInput.value = '';
        repeatingDescriptionFilterInput.value = '';
        repeatingStatusFilterSelect.value = 'all';
        minOccurrencesFilterInput.value = '2';
        similarityThresholdInput.value = '80';
        similarityValueSpan.textContent = '80%';
        updateDisplay();
    });

    quickFilterButtons.forEach(button => {
        button.addEventListener('click', () => setQuickDateRange(button.dataset.range));
    });

    downloadRepeatingReportBtn.addEventListener('click', generateRepeatingDefectsReport);

    downloadXlsxBtn.addEventListener('click', async () => {
        try {
            const filters = getCurrentFilters();
            let defectsToExport = [...currentAllDefects];

            if (filters.fleet.trim() !== '') {
                defectsToExport = defectsToExport.filter(d =>
                    String(d.fleetNumber || '').toLowerCase().includes(filters.fleet.trim().toLowerCase())
                );
            }
            if (filters.description.trim() !== '') {
                defectsToExport = defectsToExport.filter(d =>
                    String(d.description || '').toLowerCase().includes(filters.description.trim().toLowerCase())
                );
            }
            if (filters.status !== 'all') {
                defectsToExport = defectsToExport.filter(d => (filters.status === 'fixed') ? d.isFixed : !d.isFixed);
            }
            if (filters.fromDay || filters.toDay) {
                const from = filters.fromDay ? new Date(filters.fromDay).getTime() : 0;
                const to = filters.toDay ? new Date(filters.toDay).getTime() + 86400000 : Infinity;
                defectsToExport = defectsToExport.filter(d => {
                    const ts = new Date(d.timestamp).getTime();
                    return ts >= from && ts < to;
                });
            }

            if (defectsToExport.length === 0) {
                alert('No defects to export based on current filters.');
                return;
            }

            const dataForSheet = [];
            const headers = ['Priority', 'Fleet Number', 'Vehicle Type', 'Defect Area', 'Defect Subcategory', 'Defect Description', 'Logged On', 'Logged By', 'Status', 'Comments', 'Image URLs'];
            dataForSheet.push(headers);

            const rowsPromises = defectsToExport.map(async defect => {
                const loggedByDisplayName = await getDisplayNameForUser(defect.loggedInUser);
                const imageUrlsCsv = (defect.imageUrls || []).join(', ');
                const commentsCsv = (defect.comments || []).map(c =>
                    `${c.user} (${new Date(c.timestamp).toLocaleString()}): ${c.text}`
                ).join('; ');

                return [
                    defect.isFixed ? 2 : 1,
                    defect.fleetNumber,
                    getDefectBusType(defect) || 'Unknown',
                    defect.locationArea || 'Not set',
                    defect.subcategory || 'Not set',
                    defect.description,
                    new Date(defect.timestamp).toLocaleString(),
                    loggedByDisplayName,
                    defect.isFixed ? 'Fixed' : 'Outstanding',
                    commentsCsv,
                    imageUrlsCsv
                ];
            });

            const resolvedRows = await Promise.all(rowsPromises);
            resolvedRows.forEach(row => dataForSheet.push(row));

            const ws = XLSX.utils.aoa_to_sheet(dataForSheet);
            ws['!cols'] = [
                { wch: 10 }, { wch: 15 }, { wch: 28 }, { wch: 18 }, { wch: 22 }, { wch: 40 }, { wch: 20 }, { wch: 20 },
                { wch: 10 }, { wch: 50 }, { wch: 50 }
            ];

            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Defects');
            XLSX.writeFile(wb, 'bus_defects_log.xlsx');
        } catch (error) {
            console.error('Error generating Excel file:', error);
            alert('An error occurred while creating the Excel file.');
        }
    });
});
