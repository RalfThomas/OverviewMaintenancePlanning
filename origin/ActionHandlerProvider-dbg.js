/*
 * Copyright (C) 2009-2019 SAP SE or an SAP affiliate company. All rights reserved.
 */
sap.ui.define([
	"sap/ui/base/Object",
	"i2d/eam/maintenanceplanner/ovps1/util/StatusActionType",
	"i2d/eam/maintenanceplanner/ovps1/util/StatusActionOptions"
], function(BaseObject, StatusActionType, StatusActionOptions) {
	"use strict";
	return BaseObject.extend("i2d.eam.maintenanceplanner.ovps1.util.ActionHandlerProvider", {

		_oDialog: null,

		getActionHandler: function(sCustomAction, oView) {
			if (sCustomAction === "onTechnicalCompleteAction") {
				return this.onTechnicalCompleteAction.bind(this, oView);
			}
		},

		onTechnicalCompleteAction: function(oView, oEvent) {
			var oActionModel = oView.getModel("EAM_ORDER_MONITOR"),
				mOrder = oActionModel.getProperty(oEvent.getSource().getBindingContext().getPath()) || oEvent.getSource().getBindingContext().getObject();

			if(!this._canOrderBeCompleted(mOrder, oView)) {
				return;
			}

			var oInputModel = new sap.ui.model.json.JSONModel({
				"MaintenanceOrder": oEvent.getSource().getBindingContext().getProperty("MaintenanceOrder"),
				"CompletionDate": new Date(),
				"CompleteNotification": oEvent.getSource().getBindingContext().getProperty("CompleteTechlyAndSetNotifSts") ? true : false
			});
			this._handleTechnicalCompletion(oView, oInputModel);
		},
		
		_canOrderBeCompleted: function(mOrderData, oView) {
			var oI18nBundle = oView.getModel("i18n").getResourceBundle();
			
			if (mOrderData) {
				if (mOrderData.MaintenanceProcessingPhase && parseInt(mOrderData.MaintenanceProcessingPhase, 10) >= 3) {
					sap.m.MessageToast.show(oI18nBundle.getText("ymsg.orderXIsAlreadyCompleted", [mOrderData.MaintenanceOrder]), {
						duration: 3000
					});
					return false;
				} else if (mOrderData.hasOwnProperty("Completetechnical_ac") && mOrderData.Completetechnical_ac === false) {
					sap.m.MessageToast.show(oI18nBundle.getText("ymsg.orderXCannotBeCompleted", [mOrderData.MaintenanceOrder]), {
						duration: 3000
					});
					return false;
				}
			}
			return true;
		},

		_handleTechnicalCompletion: function(oView, oInputModel) {
			// Handle Technical Completion Status transaction according to user specific settings in EAM_USER transaction
			switch (oInputModel.getProperty("/CompleteNotification")) {
				case StatusActionOptions.TechnicalCompletion.DisplayPopup: // Display Popup with Options 
					this._raiseTecoDialog(oView, oInputModel);
					break;
				case StatusActionOptions.TechnicalCompletion.CompleteNotifications: // Always Complete Notifications (without showing popup)
					this._completeTechnically(oView.getModel(), {
						MaintenanceOrder: oInputModel.getProperty("/MaintenanceOrder"),
						RefDatetime: oInputModel.getProperty(
							"/CompletionDate"),
						ActionName: StatusActionType.TechnicalCompletionInclNotifications
					});
					break;
				case StatusActionOptions.TechnicalCompletion.DoNotCompleteNotifications: // Never Complete Notifications (without showing popup)
					this._completeTechnically(oView.getModel(), {
						MaintenanceOrder: oInputModel.getProperty("/MaintenanceOrder"),
						RefDatetime: oInputModel.getProperty(
							"/CompletionDate"),
						ActionName: StatusActionType.TechnicalCompletionExclNotifications
					});
					break;
				default: // Display Popup with Options 
					this._raiseTecoDialog(oView, oInputModel);
					break;
			}
		},

		_raiseTecoDialog: function(oView, oInputModel) {
			this._oDialog = sap.ui.xmlfragment("i2d.eam.maintenanceplanner.ovps1.view.DateSelectorDialog", this);
			oView.setModel(oInputModel, "InputModel");
			oView.addDependent(this._oDialog);
			this._oDialog.open();

			// Silently request XSRF token ("pre-fetch"). Will be required for submitting the FunctionImport.
			oView.getModel("EAM_ORDER_MONITOR").getSecurityToken();
		},

		_completeTechnically: function(oModel, oURLParams) {
			var oPromise = new Promise(function(resolve, reject) {
				// Note: In case of silent completion, UI5 will need to request the XSRF token first
				oModel.callFunction("/C_MaintOrderForActionCompletetechnical", {
					method: "POST",
					urlParameters: oURLParams,
					success: function(oData, oResponse) {
						resolve(oResponse);
					},
					error: function(oResponse) {
						reject(oResponse);
					}
				});
			});
			this._handleResultPromise(oPromise, oModel);
		},

		onAcceptStatusDialog: function(oEvent) {
			var oInputModel = oEvent.getSource().getModel("InputModel");
			var oCompletionDate = oInputModel.getProperty("/CompletionDate");
			var sMaintenanceOrder = oInputModel.getProperty("/MaintenanceOrder");
			var oModel = oEvent.getSource().getModel("EAM_ORDER_MONITOR");

			var sActionName = StatusActionType.TechnicalCompletionExclNotifications;
			if (oInputModel.getProperty("/CompleteNotification")) {
				sActionName = StatusActionType.TechnicalCompletionInclNotifications;
			}

			this._completeTechnically(oModel, {
				MaintenanceOrder: sMaintenanceOrder,
				RefDatetime: oCompletionDate,
				ActionName: sActionName
			});

			this._closeAndDestroyDialog();
		},

		onCancelStatusDialog: function() {
			this._closeAndDestroyDialog();
		},

		_closeAndDestroyDialog: function() {
			this._oDialog.close();
			this._oDialog.destroy();
		},

		_handleResultPromise: function(oPromise, oModel) {
			// Code is copied from Card.controller.js _callFunction method 
			// in order to be consistent with standard Action handling of Overview Page
			oPromise.then(function(oResponse) {
				var sMessage = "";
				if(oModel && oResponse && oResponse.data && oResponse.data.MaintenanceOrder) {
					var aMessages = oModel.getMessagesByEntity(oModel.createKey("C_MaintOrderForCompletionQ", { MaintenanceOrder : oResponse.data.MaintenanceOrder }));
					if(aMessages && aMessages.length === 1) {
						sMessage = aMessages[0].message;
					}
				} 
				
				if(!sMessage) {
					sMessage = sap.ui.getCore().getLibraryResourceBundle("sap.ovp").getText("Toast_Action_Success");
				}
				
				return sap.m.MessageToast.show(sMessage, {
					duration: 3000 // increased from 1000 to 3000
				});
			}).catch(function(oError) {
				var errorMessage = sap.ovp.cards.CommonUtils.showODataErrorMessages(oError);
				if (errorMessage === "" && oError.actionText) {
					errorMessage = sap.ui.getCore().getLibraryResourceBundle("sap.ovp").getText("Toast_Action_Error") + ' "' + oError.actionText +
						'"' + ".";
				}
				return sap.m.MessageBox.error(errorMessage, {
					title: sap.ui.getCore().getLibraryResourceBundle("sap.ovp").getText("OVP_GENERIC_ERROR_TITLE"),
					onClose: null,
					styleClass: "",
					initialFocus: null,
					textDirection: sap.ui.core.TextDirection.Inherit
				});
			});
		}

	});

});