/*
 * Copyright (C) 2009-2019 SAP SE or an SAP affiliate company. All rights reserved.
 */
sap.ui.define(["sap/ui/base/Object"], function(BaseObject) {
	"use strict";

	/**
	 *	Makes a SelectOptions-style object with DateTime filters ready for transport
	 *  Instead of a JavaScript Date() object, SmartFilterBar expects an ISO string in LOCAL timezone
	 *  @see sap/ui/comp/filterbar/VariantConverterFrom.prototype._addRangesAccordingMetaData
	 **/
	var fnTransformDateTimeFilterToISOString = function(oFilter) {
		var iTimezoneOffset = new Date().getTimezoneOffset() * 60000;
		if (oFilter.value1 && oFilter.value1 instanceof Date) {
			oFilter.value1 = (new Date(oFilter.value1.getTime() - iTimezoneOffset)).toISOString().slice(0, -1);
		}

		if (oFilter.value2 && oFilter.value2 instanceof Date) {
			oFilter.value2 = (new Date(oFilter.value2.getTime() - iTimezoneOffset)).toISOString().slice(0, -1);
		}

		return oFilter;
	};

	return BaseObject.extend("i2d.eam.maintenanceplanner.ovps1.util.ParameterProvider", {

		_aReferenceDateRange: null,

		constructor: function(aReferenceDateRange) {
			this._aReferenceDateRange = aReferenceDateRange;
		},

		addReferenceDateFilter: function() {
			return this._aReferenceDateRange && this._aReferenceDateRange[0] ? [ fnTransformDateTimeFilterToISOString({
				path: "ReferenceDate",
				operator: "BT",
				value1: this._aReferenceDateRange[0],
				value2: this._aReferenceDateRange[1],
				sign: "I"
			}) ] : [];
		},

		addNotifsForScreeningFilter: function() {
			var aNotifsForScreeningFilters = [{
				path: "NotifProcessingPhase",
				operator: "EQ",
				value1: "1",
				value2: null,
				sign: "I"
			}];
			Array.prototype.push.apply(aNotifsForScreeningFilters, this.addReferenceDateFilter());
			return aNotifsForScreeningFilters;
		},

		ordersForPlanningFilter: function() {
			var aOrdersForPlanningFilters = [{
				path: "MaintenanceProcessingPhase",
				operator: "EQ",
				value1: "0",
				value2: null,
				sign: "I"
			}];
			Array.prototype.push.apply(aOrdersForPlanningFilters, this.addReferenceDateFilter());
			return aOrdersForPlanningFilters;
		},

		ordersForCompletionFilter: function() {
			var aOrdersForCompletionFilters = [{
				path: "MaintenanceProcessingPhase",
				operator: "EQ",
				value1: "2",
				value2: null,
				sign: "I"
			}, {
				path: "MaintOrderIsFinallyConfirmed",
				operator: "EQ",
				value1: "true",
				value2: null,
				sign: "I"
			}];
			Array.prototype.push.apply(aOrdersForCompletionFilters, this.addReferenceDateFilter());
			return aOrdersForCompletionFilters;
		},

		addOverdueOrdersFilter: function() {
			var aOverdueOrdersFilters = [{
				path: "MaintenanceProcessingPhase",
				operator: "EQ",
				value1: "2",
				value2: null,
				sign: "I"
			}, {
				path: "IsFinallyConfirmed",
				operator: "EQ",
				value1: "false",
				value2: null,
				sign: "I"
			}];

			// An order is only "overdue" if it was meant to finish before yesterday or earlier
			// If value2 is greater than today, then set it to yesterday. 
			// This will lead to "next week"s selection to not working, but an order in the future can't be overdue yet.
			Array.prototype.push.apply(aOverdueOrdersFilters, this.addReferenceDateFilter());
			if (aOverdueOrdersFilters[2]) {
				var oToday = new Date();
				if (this._aReferenceDateRange[1] > oToday) {
					aOverdueOrdersFilters[2].value2 = oToday;
					aOverdueOrdersFilters[2].value2.setDate(oToday.getDate() - 1);
					aOverdueOrdersFilters[2] = fnTransformDateTimeFilterToISOString(aOverdueOrdersFilters[2]);
				}
			}

			return aOverdueOrdersFilters;
		},

		getCustomParamsCallback: function(sEntityName) {
			switch (sEntityName) {
				case "notifsForScreening":
					return this.addNotifsForScreeningFilter.bind(this);
				case "ordersForPlanning":
					return this.ordersForPlanningFilter.bind(this);
				case "ordersForCompletion":
					return this.ordersForCompletionFilter.bind(this);
				case "overdueOrders":
					return this.addOverdueOrdersFilter.bind(this);
				default:
					return this.addReferenceDateFilter.bind(this);
			}
		}

	});

});