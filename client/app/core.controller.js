(function () {
    'use strict';

    angular
        .module('app.core')
        .controller('coreController', coreController);


    coreController.$inject = ['$rootScope', '$location', 'restService', '$anchorScroll', '$log'];
    /* @ngInject */
    function coreController($rootScope, $location, restService, $anchorScroll, $log) {
        var vm = this;

        var CURRENCY_SYMBOL = '£';
        var DATE_DISPLAY_FORMAT = 'DD/MM/YYYY';
        var DATE_VALIDATE_FORMAT = 'YYYY-M-D';

        var ACCOUNT_NUMBER_REGEX = /^(?!0{8})[0-9]{8}$/;
        var SORT_CODE_REGEX = /^(?!00-00-00)(?:\d{2}-){2}\d{2}$/;
        var BARCLAYS_SORT_CODE_REGEX = /^(?!00-00-00)(?:13|14|2[0-9])(?:-\d{2}){2}$/;

        var NON_ZERO_WHOLE_NUMBER_REGEX = /^0*[1-9]\d*$/; //allows leading zeros
        var NUMBER_REGEX = /^\d*\.?\d*$/;
        var WHOLE_NUMBER_REGEX = /^\d*$/;

        var STUDENT_TYPE_NON_DOCTORATE_DISPLAY = "Tier 4 (General) student";
        var STUDENT_TYPE_DOCTORATE_DISPLAY = "Tier 4 (General) student (doctorate extension scheme)";

        initialise();

        vm.formatMoneyWholePounds = function (moneyToFormat) {
            return accounting.formatMoney(moneyToFormat, {symbol: CURRENCY_SYMBOL, precision: 0});
        };

        vm.formatMoneyPoundsPence = function (moneyToFormat) {
            return accounting.formatMoney(moneyToFormat, {symbol: CURRENCY_SYMBOL, precision: 2});
        };


        vm.getPeriodChecked = function () {
            return vm.formatDate(vm.model.periodCheckedFrom) +
                " to " +
                vm.formatDate(vm.model.periodCheckedTo)
        }

        vm.getFullEndDate = function () {
            var month = vm.model.endDateMonth.length > 1 ? vm.model.endDateMonth : '0' + vm.model.endDateMonth;
            var day = vm.model.endDateDay.length > 1 ? vm.model.endDateDay : '0' + vm.model.endDateDay
            return vm.model.endDateYear + '-' + month + '-' + day;
        };

        vm.formatEndDate = function () {
            return vm.formatDate(vm.getFullEndDate());
        }

        vm.formatDate = function (dateToFormat) {
            return moment(dateToFormat, DATE_VALIDATE_FORMAT, true).format(DATE_DISPLAY_FORMAT);
        }

        vm.getFullSortCode = function () {
            return vm.model.sortCodeFirst + '-' + vm.model.sortCodeSecond + '-' + vm.model.sortCodeThird;
        }

        vm.getFullSortCodeDigits = function () {
            return vm.model.sortCodeFirst + vm.model.sortCodeSecond + vm.model.sortCodeThird;
        }

        vm.scrollTo = function (anchor) {
            $anchorScroll(anchor);
        };

        function copyInputs() {
            vm.model.periodCheckedTo = vm.getFullEndDate();
            vm.model.accountNumberChecked = vm.model.accountNumber;
            vm.model.sortCodeChecked = vm.getFullSortCode();
            vm.model.inLondonChecked = vm.model.inLondon == 'true' ? 'Yes' : 'No';
            vm.model.courseLengthChecked = vm.model.courseLength;
            vm.model.totalTuitionFeesChecked = vm.model.totalTuitionFees;
            vm.model.tuitionFeesAlreadyPaidChecked = vm.model.tuitionFeesAlreadyPaid;
            vm.model.accommodationFeesAlreadyPaidChecked = vm.model.accommodationFeesAlreadyPaid;
            vm.model.numberOfDependantsChecked = vm.model.numberOfDependants;
        }

        vm.submit = function () {

            if (validateForm()) {

                restService.checkFinancialStatus(
                    vm.model.accountNumber,
                    vm.getFullSortCodeDigits(),
                    vm.getFullEndDate(),
                    vm.model.inLondon,
                    vm.model.studentType,
                    vm.model.courseLength,
                    vm.model.totalTuitionFees,
                    vm.model.tuitionFeesAlreadyPaid,
                    vm.model.accommodationFeesAlreadyPaid,
                    vm.model.numberOfDependants
                )
                    .then(function (data) {
                        copyInputs();
                        vm.model.fundingRequirementMet = data.fundingRequirementMet;
                        vm.model.minimum = data.minimum;
                        vm.model.periodCheckedFrom = data.periodCheckedFrom;

                        if (vm.model.fundingRequirementMet == true) {
                            $location.path('/financial-status-result-pass');
                        } else {
                            vm.model.minimumBalanceDate = data.minimumBalanceDate;
                            vm.model.minimumBalanceValue = data.minimumBalanceValue;
                            $location.path('/financial-status-result-not-pass');
                        }
                    }).catch(function (error) {
                    $log.debug("received a non success result: " + error.status + " : " + error.statusText)
                    if (error.status === 404) {
                        copyInputs();
                        $location.path('/financial-status-no-record');
                    } else {
                        vm.serverError = 'Unable to process your request, please try again.';
                        vm.serverErrorDetail = error.data.message;
                    }

                });
            } else {
                vm.validateError = true;
            }
        };

        vm.newSearch = function () {
            initialise()
            $location.path('/financial-status-student-type');
        };

        function initialise() {
            vm.model = {

                endDateDay: '',
                endDateMonth: '',
                endDateYear: '',

                inLondon: '',
                studentType: '',
                courseLength: '',
                totalTuitionFees: '',
                tuitionFeesAlreadyPaid: '',
                accommodationFeesAlreadyPaid: '',
                numberOfDependants: '',

                accountNumber: '',
                sortCodeFirst: '',
                sortCodeSecond: '',
                sortCodeThird: '',

                totalFundsRequired: '',

                fundingRequirementMet: '',
                minimum: '',
                accountNumberChecked: '',
                sortCodeChecked: '',
                periodCheckedFrom: '',
                periodCheckedTo: '',
                inLondonChecked: '',
                studentTypeChecked: '',
                courseLengthChecked: '',
                totalTuitionFeesChecked: '',
                tuitionFeesAlreadyPaidChecked: '',
                accommodationFeesAlreadyPaidChecked: '',
                numberOfDependantsChecked: '',
                minimumBalanceDate: '',
                minimumBalanceValue: '',

                doctorate: false
            };

            vm.validateError = false;

            vm.endDateInvalidError = false;
            vm.endDateMissingError = false;

            vm.inLondonInvalidError = false;
            vm.inLondonMissingError = false;

            vm.studentTypeMissingError = false;

            vm.courseLengthInvalidError = false;
            vm.courseLengthMissingError = false;

            vm.totalTuitionFeesInvalidError = false;
            vm.totalTuitionFeesMissingError = false;

            vm.tuitionFeesAlreadyPaidInvalidError = false;
            vm.tuitionFeesAlreadyPaidMissingError = false;

            vm.accommodationFeesAlreadyPaidInvalidError = false;
            vm.accommodationFeesAlreadyPaidMissingError = false;

            vm.accountNumberInvalidError = false;
            vm.accountNumberMissingError = false;

            vm.numberOfDependantsInvalidError = false;
            vm.numberOfDependantsMissingError = false;

            vm.sortCodeInvalidError = false;
            vm.sortCodeMissingError = false;

            vm.serverError = '';
            vm.serverErrorDetail = '';
        }

        function clearErrors() {
            vm.endDateInvalidError = false;
            vm.endDateMissingError = false;

            vm.inLondonInvalidError = false;
            vm.inLondonMissingError = false;

            vm.studentTypeMissingError = false;

            vm.courseLengthInvalidError = false;
            vm.courseLengthMissingError = false;

            vm.totalTuitionFeesInvalidError = false;
            vm.totalTuitionFeesMissingError = false;

            vm.tuitionFeesAlreadyPaidInvalidError = false;
            vm.tuitionFeesAlreadyPaidMissingError = false;

            vm.accommodationFeesAlreadyPaidInvalidError = false;
            vm.accommodationFeesAlreadyPaidMissingError = false;

            vm.numberOfDependantsInvalidError = false;
            vm.numberOfDependantsMissingError = false;

            vm.accountNumberInvalidError = false;
            vm.accountNumberMissingError = false;

            vm.sortCodeInvalidError = false;
            vm.sortCodeMissingError = false;

            vm.serverError = '';
            vm.serverErrorDetail = '';
            vm.validateError = false;
        }

        function validateForm() {
            var validated = true;
            clearErrors();

            if (vm.model.endDateDay === null ||
                vm.model.endDateMonth === null ||
                vm.model.endDateYear === null) {
                vm.queryForm.endDateDay.$setValidity(false);
                vm.queryForm.endDateMonth.$setValidity(false);
                vm.queryForm.endDateYear.$setValidity(false);
                vm.endDateMissingError = true;
                validated = false;
            } else if (!moment(vm.getFullEndDate(), DATE_VALIDATE_FORMAT, true).isValid()) {
                vm.endDateInvalidError = true;
                validated = false;
            } else if (moment(vm.getFullEndDate(), DATE_VALIDATE_FORMAT, true).isAfter(moment(), 'day')) {
                vm.endDateInvalidError = true;
                validated = false;
            }

            if (vm.model.inLondon === '' || vm.model.inLondon === null) {
                vm.queryForm.inLondon.$setValidity(false);
                vm.inLondonMissingError = true;
                validated = false;
            }

            if (vm.model.courseLength === '' || vm.model.courseLength === null) {
                vm.queryForm.courseLength.$setValidity(false);
                vm.courseLengthMissingError = true;
                validated = false;
            } else if (vm.model.courseLength !== null && !(NON_ZERO_WHOLE_NUMBER_REGEX.test(vm.model.courseLength))) {
                vm.queryForm.courseLength.$setValidity(false);
                vm.courseLengthInvalidError = true;
                validated = false;
            } else if (!vm.model.doctorate && vm.model.courseLength > 9) {
                vm.queryForm.courseLength.$setValidity(false);
                vm.courseLengthInvalidError = true;
                validated = false;
            } else if (vm.model.doctorate && vm.model.courseLength > 2) {
                vm.queryForm.courseLength.$setValidity(false);
                vm.courseLengthInvalidError = true;
                validated = false;
            }

            if (!vm.model.doctorate) {
                if (vm.model.totalTuitionFees === '' || vm.model.totalTuitionFees === null) {
                    vm.queryForm.totalTuitionFees.$setValidity(false);
                    vm.totalTuitionFeesMissingError = true;
                    validated = false;
                } else if (vm.model.totalTuitionFees !== null && !(NUMBER_REGEX.test(vm.model.totalTuitionFees))) {
                    vm.queryForm.totalTuitionFees.$setValidity(false);
                    vm.totalTuitionFeesInvalidError = true;
                    validated = false;
                }

                if (vm.model.tuitionFeesAlreadyPaid === '' || vm.model.tuitionFeesAlreadyPaid === null) {
                    vm.queryForm.tuitionFeesAlreadyPaid.$setValidity(false);
                    vm.tuitionFeesAlreadyPaidMissingError = true;
                    validated = false;
                } else if (vm.model.tuitionFeesAlreadyPaid !== null && !(NUMBER_REGEX.test(vm.model.tuitionFeesAlreadyPaid))) {
                    vm.queryForm.tuitionFeesAlreadyPaid.$setValidity(false);
                    vm.tuitionFeesAlreadyPaidInvalidError = true;
                    validated = false;
                }
            }

            if (vm.model.accommodationFeesAlreadyPaid === '' || vm.model.accommodationFeesAlreadyPaid === null) {
                vm.queryForm.accommodationFeesAlreadyPaid.$setValidity(false);
                vm.accommodationFeesAlreadyPaidMissingError = true;
                validated = false;
            } else if (vm.model.accommodationFeesAlreadyPaid !== null) {
                if (!(NUMBER_REGEX.test(vm.model.accommodationFeesAlreadyPaid)) || vm.model.accommodationFeesAlreadyPaid > 1265) {
                    vm.queryForm.accommodationFeesAlreadyPaid.$setValidity(false);
                    vm.accommodationFeesAlreadyPaidInvalidError = true;
                    validated = false;
                }
            }

            if (vm.model.numberOfDependants === '' || vm.model.numberOfDependants === null) {
                vm.queryForm.numberOfDependants.$setValidity(false);
                vm.numberOfDependantsMissingError = true;
                validated = false;
            } else if (vm.model.numberOfDependants !== null && !(WHOLE_NUMBER_REGEX.test(vm.model.numberOfDependants))) {
                vm.queryForm.numberOfDependants.$setValidity(false);
                vm.numberOfDependantsInvalidError = true;
                validated = false;
            }

            if (vm.model.sortCodeFirst === null ||
                vm.model.sortCodeSecond === null ||
                vm.model.sortCodeThird === null) {
                vm.queryForm.sortCodeFirst.$setValidity(false);
                vm.queryForm.sortCodeSecond.$setValidity(false);
                vm.queryForm.sortCodeThird.$setValidity(false);
                vm.sortCodeMissingError = true;
                validated = false;
            } else {
                if (!SORT_CODE_REGEX.test(vm.getFullSortCode())) {
                    vm.sortCodeInvalidError = true;
                    validated = false;
                }
            }

            if (vm.model.accountNumber === '' || vm.model.accountNumber === null) {
                vm.queryForm.accountNumber.$setValidity(false);
                vm.accountNumberMissingError = true;
                validated = false;
            } else {
                if (!ACCOUNT_NUMBER_REGEX.test(vm.model.accountNumber)) {
                    vm.accountNumberInvalidError = true;
                    vm.queryForm.accountNumber.$setValidity(false);
                    validated = false;
                }
            }

            return validated;
        }


        vm.submitStudentType = function () {

            if (validateStudentTypeForm()) {
                vm.model.studentTypeChecked = vm.model.studentType == 'doctorate' ? STUDENT_TYPE_DOCTORATE_DISPLAY : STUDENT_TYPE_NON_DOCTORATE_DISPLAY;
                vm.model.doctorate = vm.model.studentType == 'doctorate' ? true : false;
                if (vm.model.doctorate) {
                    $location.path('/financial-status-query-doctorate');
                } else {
                    $location.path('/financial-status-query-non-doctorate');
                }
            } else {
                vm.validateError = true;
            }
        }

        vm.next = function () {
            $location.path('/financial-status-query');
        }


        function validateStudentTypeForm() {
            var validated = true;
            clearErrors();

            if (vm.model.studentType == null || vm.model.studentType === '') {
                vm.queryForm.studentType.$setValidity(false);
                vm.studentTypeMissingError = true;
                validated = false;
            }

            return validated;
        }
    }

})();
