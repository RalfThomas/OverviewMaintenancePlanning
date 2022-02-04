/*
 * Copyright (C) 2009-2019 SAP SE or an SAP affiliate company. All rights reserved.
 */
sap.ui.define([
	"sap/ui/base/Object"
], function(BaseObject) {
	"use strict";
	return BaseObject.extend("i2d.eam.maintenanceplanner.ovps1.util.FilterProvider", {

		_oLocaleData: null,

		constructor: function() {
			this._oLocaleData = new sap.ui.core.LocaleData(sap.ui.getCore().getConfiguration().getLocale());
		},

		getDateRangeForPredefinedPeriod: function(sPeriod) {
			var oReferenceDate = new Date(),
				iFirstDayOfWeek = this._oLocaleData.getFirstDayOfWeek();

			// first, we add the number of weeks as determined by the period
			var iOffset = this._resolveTimeOffset(sPeriod);

			// then, we find out what weekday it is
			var iReferenceDayOfWeek = oReferenceDate.getDay();

			var aReturn = [new Date(), new Date()];
			if (iFirstDayOfWeek > iReferenceDayOfWeek) {
				aReturn[1].setDate(oReferenceDate.getDate() + iOffset + iFirstDayOfWeek - iReferenceDayOfWeek - 1);
				aReturn[0].setTime(aReturn[1].getTime());
				aReturn[0].setDate(aReturn[1].getDate() - 6);
			} else {
				aReturn[0].setDate(oReferenceDate.getDate() + iOffset + iFirstDayOfWeek - iReferenceDayOfWeek);
				aReturn[1].setTime(aReturn[0].getTime());
				aReturn[1].setDate(aReturn[0].getDate() + 6);
			}
			return aReturn;
		},

		_resolveTimeOffset: function(sPeriod) {
			switch (sPeriod) {
				case "THIS_WEEK":
					return 0;
				case "NEXT_WEEK":
					return 7;
				case "IN_2_WEEKS":
					return 14;
			}
		}

	});
});