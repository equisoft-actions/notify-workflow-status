function main({ core, inputs }) {
    const validStatuses = ['cancelled', 'failure', 'success', 'warning'];
    const workflowStatus = inputs['workflow-status']?.toLowerCase();
    let status;

    if (workflowStatus && validStatuses.includes(workflowStatus)) {
        status = workflowStatus;
    } else {
        try {
            status = computeStatusFromNeeds(core, inputs);
        } catch (error) {
            status = 'failure';
            core.error(`Invalid needs input: ${error.message}`);
        }
    }

    if (status === 'failure') {
        core.setFailed();
    }
    core.setOutput('status', status);
}

function computeStatusFromNeeds(core, inputs) {
    let status;
    const needsInput = inputs['needs'];
    const downgradedJobs = inputs['downgrade-to-warning']?.toLowerCase()?.split(',')
        ?.map(job => job.trim()) || [];

    const needs = Object.entries(needsInput ? JSON.parse(needsInput) : {})
        .map(([job, { result }]) => {
            if (result === 'failure' && downgradedJobs.includes(job.toLowerCase())) {
                return { job, result: 'warning' };
            }
            return { job, result };
        });

    if (needs.length === 0) {
        status = 'success';
        core.warning('Empty needs input provided. Assuming success.');
    } else if (needs.some(({ result }) => result === 'cancelled')) {
        status = 'cancelled';
    } else if (needs.every(({ result }) => result === 'success' || result === 'skipped')) {
        status = 'success';
    } else if (needs.some(({ result }) => result === 'failure')) {
        status = 'failure';
    } else {
        status = 'warning';
    }

    return status;
}

module.exports = main;
