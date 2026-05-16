window.DVSA_GUIDANCE_SOURCES = {
    walkaroundChecks: {
        title: 'DVSA: Carry out bus or coach daily walkaround checks',
        url: 'https://www.gov.uk/government/publications/public-service-vehicle-drivers-daily-walkaround-check'
    },
    roadworthiness: {
        title: 'DVSA: Guide to maintaining roadworthiness',
        url: 'https://www.gov.uk/government/publications/guide-to-maintaining-roadworthiness'
    },
    categorisation: {
        title: 'DVSA: Categorisation of vehicle defects',
        url: 'https://www.gov.uk/government/publications/categorisation-of-defects'
    }
};

window.DVSA_GUIDANCE_RULES = [
    {
        handbookSection: 'Walkaround checks - tyres and wheels',
        sourceKey: 'walkaroundChecks',
        priority: 'stop_and_escalate_now',
        severity: 'possible_dangerous',
        confidence: 'high',
        engineeringReviewRequired: true,
        summary: 'Tyre or wheel damage can indicate an immediate roadworthiness risk.',
        why: 'Tyre damage, exposed cords, sidewall bulges, flats, or loose wheel security can need immediate escalation.',
        triggers: ['tyre', 'tire', 'bulge', 'cord', 'flat', 'puncture', 'wheel nut', 'loose wheel', 'rim cracked']
    },
    {
        handbookSection: 'Walkaround checks - steering, braking and warning systems',
        sourceKey: 'roadworthiness',
        priority: 'stop_and_escalate_now',
        severity: 'possible_major',
        confidence: 'high',
        engineeringReviewRequired: true,
        summary: 'ABS or brake-system warning lights should be escalated before the vehicle continues in service.',
        why: 'ABS lights, brake warning lamps, and similar dash warnings can point to a braking-system fault that needs immediate engineering attention.',
        triggers: ['abs', 'abs light', 'abs fault', 'abs warning', 'brake warning', 'warning light', 'warning lamp', 'dash warning', 'dashboard warning']
    },
    {
        handbookSection: 'Walkaround checks - steering, braking and stability related issues',
        sourceKey: 'roadworthiness',
        priority: 'stop_and_escalate_now',
        severity: 'possible_dangerous',
        confidence: 'high',
        engineeringReviewRequired: true,
        summary: 'Steering, braking, or stability faults should normally be escalated immediately.',
        why: 'Defects affecting steering, braking, suspension, or stability can become serious safety issues very quickly.',
        triggers: ['steering', 'brake', 'air leak', 'suspension', 'pulling', 'loss of braking', 'abs warning', 'power steering']
    },
    {
        handbookSection: 'Walkaround checks - doors, emergency exits and passenger safety',
        sourceKey: 'walkaroundChecks',
        priority: 'engineering_check_recommended',
        severity: 'possible_major',
        confidence: 'medium',
        engineeringReviewRequired: true,
        summary: 'Door and emergency exit faults usually need engineering review.',
        why: 'Passenger doors and emergency exits are safety-critical, even when the defect does not look severe at first glance.',
        triggers: ['door', 'doors', 'emergency exit', 'stuck open', 'stuck shut', "won't close", 'ramp']
    },
    {
        handbookSection: 'Walkaround checks - glass, mirrors, wipers and driver\'s view',
        sourceKey: 'walkaroundChecks',
        priority: 'engineering_check_recommended',
        severity: 'possible_major',
        confidence: 'medium',
        engineeringReviewRequired: true,
        summary: 'Visibility-related faults should usually be checked by engineering.',
        why: 'Mirrors, wipers, washers, and glass can directly affect the driver\'s ability to operate safely.',
        triggers: ['windscreen', 'windshield', 'mirror', 'wiper', 'washer', 'visibility', 'cracked glass', 'demister']
    },
    {
        handbookSection: 'Walkaround checks - lamps, indicators and destination displays',
        sourceKey: 'walkaroundChecks',
        priority: 'engineering_check_recommended',
        severity: 'possible_major',
        confidence: 'medium',
        engineeringReviewRequired: true,
        summary: 'External light or signal faults often need checking before service continues.',
        why: 'Indicators, brake lights, and external lamps affect signalling and visibility to other road users.',
        triggers: ['headlight', 'headlamp', 'indicator', 'brake light', 'rear light', 'lamp', 'lights out', 'hazard light']
    },
    {
        handbookSection: 'Roadworthiness guide - leaks, engine condition and fire risk',
        sourceKey: 'roadworthiness',
        priority: 'engineering_check_recommended',
        severity: 'possible_major',
        confidence: 'medium',
        engineeringReviewRequired: true,
        summary: 'Leaks, overheating, or engine warning signs should be reviewed by engineering.',
        why: 'Oil, coolant, fuel leaks, overheating, smoke, or strong burning smells can escalate quickly.',
        triggers: ['oil leak', 'coolant', 'fuel leak', 'diesel leak', 'overheating', 'smoke', 'burning smell', 'engine warning']
    },
    {
        handbookSection: 'Walkaround checks - interior, saloon and passenger comfort items',
        sourceKey: 'walkaroundChecks',
        priority: 'continue_and_monitor',
        severity: 'possible_minor',
        confidence: 'low',
        engineeringReviewRequired: false,
        summary: 'This looks more like a lower-risk comfort or saloon issue.',
        why: 'Interior comfort faults can still matter, but many are lower risk unless they create a passenger hazard.',
        triggers: ['seat trim', 'bell', 'heating', 'lighting', 'flooring', 'interior panel', 'saloon']
    }
];

window.buildClientDvsaGuidance = function buildClientDvsaGuidance(defect) {
    const text = [
        defect.fleetNumber,
        defect.busType,
        defect.locationArea,
        defect.subcategory,
        defect.description
    ].filter(Boolean).join(' ').toLowerCase();

    const matches = window.DVSA_GUIDANCE_RULES.filter((rule) =>
        rule.triggers.some((trigger) => text.includes(trigger.toLowerCase()))
    );

    if (matches.length === 0) {
        return {
            priority: 'engineering_check_recommended',
            severity: 'possible_major',
            confidence: 'low',
            engineeringReviewRequired: true,
            handbookSection: 'Roadworthiness guide - manual engineering review',
            summary: 'This defect should be reviewed by engineering because no closer automatic DVSA-style match was found.',
            why: 'This is a fallback recommendation when the wording does not clearly match one of the stored DVSA guidance patterns.',
            sourceReferences: [
                window.DVSA_GUIDANCE_SOURCES.roadworthiness,
                window.DVSA_GUIDANCE_SOURCES.categorisation
            ],
            disclaimer: 'Guidance only. Final decision rests with engineering or management.'
        };
    }

    const priorityOrder = { continue_and_monitor: 1, engineering_check_recommended: 2, stop_and_escalate_now: 3 };
    const severityOrder = { possible_minor: 1, possible_major: 2, possible_dangerous: 3 };
    const confidenceOrder = { low: 1, medium: 2, high: 3 };
    const highest = (items, order, field) => items.reduce((best, item) => (!best || (order[item[field]] || 0) > (order[best[field]] || 0) ? item : best), null);

    const bestPriority = highest(matches, priorityOrder, 'priority');
    const bestSeverity = highest(matches, severityOrder, 'severity');
    const bestConfidence = highest(matches, confidenceOrder, 'confidence');
    const sourceReferences = [...new Map(matches.map((rule) => {
        const source = window.DVSA_GUIDANCE_SOURCES[rule.sourceKey];
        return [source.url, source];
    })).values()];

    return {
        priority: bestPriority.priority,
        severity: bestSeverity.severity,
        confidence: bestConfidence.confidence,
        engineeringReviewRequired: matches.some((rule) => rule.engineeringReviewRequired),
        handbookSection: matches[0].handbookSection,
        summary: bestPriority.summary,
        why: matches.map((rule) => rule.why).join(' '),
        sourceReferences,
        disclaimer: 'Guidance only. Final decision rests with engineering or management.'
    };
};

window.fetchDvsaGuidancePreview = async function fetchDvsaGuidancePreview(defect) {
    const fallback = window.buildClientDvsaGuidance(defect);
    if (!window.defectFunctions) {
        return fallback;
    }

    try {
        const previewCallable = window.defectFunctions.httpsCallable('previewDvsaGuidance');
        const result = await previewCallable({ defect });
        return result?.data?.guidance || fallback;
    } catch (error) {
        console.error('Could not fetch AI DVSA guidance preview:', error);
        return fallback;
    }
};

window.reassessOutstandingDvsaGuidance = async function reassessOutstandingDvsaGuidance(options = {}) {
    if (!window.defectFunctions) {
        throw new Error('Firebase Functions is not available on this page.');
    }

    const reassessCallable = window.defectFunctions.httpsCallable('reassessOutstandingDefects');
    const result = await reassessCallable(options);
    return result?.data || { updated: 0, skipped: 0, scanned: 0, usedAi: false };
};
