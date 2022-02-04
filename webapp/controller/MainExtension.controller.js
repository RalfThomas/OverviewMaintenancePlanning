sap.ui.define([
	"../util/FilterProvider",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"zi2d/eam/maintenanceplanner/ovps1/util/ParameterProvider",
	"zi2d/eam/maintenanceplanner/ovps1/util/ActionHandlerProvider"
], function (MyFilterProvider, Filter, FilterOperator, ParameterProvider, ActionHandlerProvider) {
	"use strict";

	// using "flat type" because typed controllers are not supported in this scenario (as per UI5 documentation)
	return sap.ui.controller("zi2d.eam.maintenanceplanner.ovps1.controller.MainExtension", {

		_oFilterProvider: null,
		_oReferenceDateRange: null,
		_oReferencePeriodSelect: null,
		_aReferenceDateRange: null,

		onInit: function () {
			this._oFilterProvider = new MyFilterProvider();
			this._oReferenceDateRange = this.byId("maintOrderMonitorReferenceDateRange");
			this._oReferencePeriodSelect = this.byId("maintOrderMonitorPredefinedReferencePeriodSelect");
		},

		applyPredefinedReferencePeriod: function (sPeriodKey) {
			if (sPeriodKey === "CUSTOM") {
				this._oReferenceDateRange.focus();
				return;
			}

			this._aReferenceDateRange = this._oFilterProvider.getDateRangeForPredefinedPeriod(sPeriodKey);
			this._oReferenceDateRange.setDateValue(this._aReferenceDateRange[0]);
			this._oReferenceDateRange.setSecondDateValue(this._aReferenceDateRange[1]);
			this._oReferenceDateRange.setValueState(sap.ui.core.ValueState.None);
			try {
				this.getView().byId("ovpGlobalFilter").fireAssignedFiltersChanged();
			} catch (e) { }
		},

		onReferencePeriodSelectionChanged: function (oEvent) {
			var sSelectedKey = oEvent.getSource().getSelectedItem().data("referencePeriodKey");
			this.applyPredefinedReferencePeriod(sSelectedKey);
		},

		onReferenceDateRangeChanged: function (oEvent) {
			var oFrom = oEvent.getParameter("from"),
				oTo = oEvent.getParameter("to"),
				bValid = oEvent.getParameter("valid");

			this._oReferenceDateRange.setValueState(bValid ? sap.ui.core.ValueState.None : sap.ui.core.ValueState.Error);

			if (!oFrom || !oTo || !this._aReferenceDateRange || !this._aReferenceDateRange[0] || !this._aReferenceDateRange[1] || oFrom.toDateString() !==
				this._aReferenceDateRange[0].toDateString() || oTo.toDateString() !== this._aReferenceDateRange[1].toDateString()) {
				this._oReferencePeriodSelect.setSelectedItem(this._oReferencePeriodSelect.getSelectableItems().filter(function (oItem) {
					return oItem.data("referencePeriodKey") === "CUSTOM";
				})[0]);
				this._aReferenceDateRange = [oFrom, oTo];
			}
		},

		getCustomFilters: function () {
			var oDateValue1 = this._oReferenceDateRange.getDateValue(),
				oSelectedPeriodItem = this._oReferencePeriodSelect.getSelectedItem(),
				sSelectedPeriodKey = oSelectedPeriodItem ? oSelectedPeriodItem.data("referencePeriodKey") : null;

			if (!oDateValue1) {
				if (sSelectedPeriodKey !== "CUSTOM") {
					this.applyPredefinedReferencePeriod(sSelectedPeriodKey);
					oDateValue1 = this._oReferenceDateRange.getDateValue();
				} else {
					return undefined;
				}
			}

			var oDateValue2 = this._oReferenceDateRange.getSecondDateValue();
			return new Filter("ReferenceDate", FilterOperator.BT,
				new Date(oDateValue1.getTime() + oDateValue1.getTimezoneOffset() * -60000),
				new Date(oDateValue2.getTime() + oDateValue2.getTimezoneOffset() * -60000));
		},

		getCustomAppStateDataExtension: function (oCustomData) {
			var oSelectedPeriodItem = this._oReferencePeriodSelect.getSelectedItem();

			if (oCustomData && oSelectedPeriodItem) {
				oCustomData._ReferencePeriod = oSelectedPeriodItem.data("referencePeriodKey");

				if (oCustomData._ReferencePeriod === "CUSTOM") {
					oCustomData._CustomReferenceDate = [this._oReferenceDateRange.getDateValue()];
					if (!oCustomData._CustomReferenceDate[0]) {
						// Forget the range - there is no valid range:
						oCustomData._CustomReferenceDate = [];
					} else {
						oCustomData._CustomReferenceDate.push(this._oReferenceDateRange.getSecondDateValue());
					}
				} else {
					oCustomData._CustomReferenceDate = [];
				}
			}
		},

		restoreCustomAppStateDataExtension: function (oCustomData) {
			if (oCustomData && oCustomData._ReferencePeriod) {
				this._oReferencePeriodSelect.setSelectedItem(this._oReferencePeriodSelect.getSelectableItems().filter(function (oItem) {
					return oItem.data("referencePeriodKey") === oCustomData._ReferencePeriod;
				})[0]);

				if (oCustomData._ReferencePeriod !== "CUSTOM") {
					this.applyPredefinedReferencePeriod(oCustomData._ReferencePeriod);
				} else if (oCustomData._CustomReferenceDate.length) {
					this._aReferenceDateRange = [new Date(oCustomData._CustomReferenceDate[0]), new Date(oCustomData._CustomReferenceDate[1])];
					this._oReferenceDateRange.setDateValue(this._aReferenceDateRange[0]);
					this._oReferenceDateRange.setSecondDateValue(this._aReferenceDateRange[1]);
				} else {
					this._oReferenceDateRange.setDateValue(null);
					this._oReferenceDateRange.setSecondDateValue(null);
				}
			}
		},

		// Handle Custom Parameters
		onCustomParams: function (sEntityName) {
			return new ParameterProvider(this._aReferenceDateRange).getCustomParamsCallback(sEntityName);
		},

		// Handle Custom Actions
		onCustomActionPress: function (sCustomAction) {
			return new ActionHandlerProvider().getActionHandler(sCustomAction, this.getView());
		}

	});
});