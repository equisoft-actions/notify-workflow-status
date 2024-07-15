const main = require('./main.js');
const { when } = require('jest-when');

describe('Main', () => {
    let core;

    beforeEach(() => {
        core = {
            setFailed: jest.fn(),
            getInput: jest.fn(),
            setOutput: jest.fn(),
            warning: jest.fn(),
        };
    });

    afterEach(() => {
        // core.getInput is bugged in composite actions. See https://github.com/actions/toolkit/issues/1124
        expect(core.getInput).not.toHaveBeenCalled();
    });

    it('should output success with empty requirements', () => {
        main({ core, inputs: {} });

        expect(core.setOutput).toHaveBeenCalledWith('status', 'success');
        expect(core.warning).toHaveBeenCalled();
    });

    it.each([
        {
            testDescription: 'all successful requirements',
            expected: 'success',
            needs: {
                unit_tests: { result: 'success' },
                image: { result: 'success' },
                'docker-security': { result: 'skipped' },
            },
        },
        {
            testDescription: 'any failed requirement',
            expected: 'failure',
            needs: {
                unit_tests: { result: 'success' },
                image: { result: 'failure' },
                'docker-security': { result: 'skipped' },
            },
        },
        {
            testDescription: 'downgraded failed requirement',
            expected: 'warning',
            needs: {
                image: { result: 'failure' },
                'docker-security': { result: 'skipped' },
            },
            'downgrade-to-warning': 'image',
        },
        {
            testDescription: 'both downgraded and failed requirements',
            expected: 'failure',
            needs: {
                image: { result: 'failure' },
                sast: { result: 'failure' },
                'docker-security': { result: 'skipped' },
            },
            'downgrade-to-warning': 'sast, nothing',
        },
        {
            testDescription: 'all skipped requirements',
            expected: 'success',
            needs: {
                image: { result: 'skipped' },
                'docker-security': { result: 'skipped' },
            },
        },
        {
            testDescription: 'any cancelled requirement',
            expected: 'cancelled',
            needs: {
                test: { result: 'success' },
                lint: { result: 'failure' },
                image: { result: 'cancelled' },
                sast: { result: 'failure' },
                'docker-security': { result: 'skipped' },
            },
            'downgrade-to-warning': 'sast',
        },
    ])('should output $expected with $testDescription', ({ name, expected, ...inputs }) => {
        inputs.needs = JSON.stringify(inputs.needs);

        main({ core, inputs });

        expect(core.setOutput).toHaveBeenCalledWith('status', expected);
    });
});
