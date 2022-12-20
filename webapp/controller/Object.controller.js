sap.ui.define(
  [
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/routing/History",
    "../model/formatter",
    "sap/ui/core/format/DateFormat",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/core/Fragment",
  ],
  function (
    BaseController,
    JSONModel,
    History,
    formatter,
    DateFormat,
    Filter,
    FilterOperator,
    Fragment
  ) {
    "use strict";

    return BaseController.extend(
      "com.wec.hr.u135.ZHR_WSM_UI35.controller.Object",
      {
        formatter: formatter,

        /* =========================================================== */
        /* lifecycle methods                                           */
        /* =========================================================== */

        /**
         * Called when the worklist controller is instantiated.
         * @public
         */
        onInit: function () {
          // Model used to manipulate control states. The chosen values make sure,
          // detail page is busy indication immediately so there is no break in
          // between the busy indication for loading the view's meta data
          var iOriginalBusyDelay,
            oViewModel = new JSONModel({
              busy: true,
              delay: 0,
            });

          this.getRouter()
            .getRoute("object")
            .attachPatternMatched(this._onObjectMatched, this);

          // Store original busy indicator delay, so it can be restored later on
          iOriginalBusyDelay = this.getView().getBusyIndicatorDelay();
          this.setModel(oViewModel, "objectView");
          this.getOwnerComponent()
            .getModel()
            .metadataLoaded()
            .then(function () {
              // Restore original busy indicator delay for the object view
              oViewModel.setProperty("/delay", iOriginalBusyDelay);
            });
        },

        /* =========================================================== */
        /* event handlers                                              */
        /* =========================================================== */

        /**
         * Event handler  for navigating back.
         * It there is a history entry we go one step back in the browser history
         * If not, it will replace the current entry of the browser history with the worklist route.
         * @public
         */
        onNavBack: function () {
          var sPreviousHash = History.getInstance().getPreviousHash();

          if (sPreviousHash !== undefined) {
            history.go(-1);
          } else {
            this.getRouter().navTo("worklist", {}, true);
          }
        },

        /* =========================================================== */
        /* internal methods                                            */
        /* =========================================================== */

        /**
         * Binds the view to the object path.
         * @function
         * @param {sap.ui.base.Event} oEvent pattern match event in route 'object'
         * @private
         */
        _onObjectMatched: function (oEvent) {
          var sObjectId = oEvent.getParameter("arguments").objectId;
          this.getModel()
            .metadataLoaded()
            .then(
              function () {
                var sObjectPath = this.getModel().createKey("Products", {
                  ProductID: sObjectId,
                });
                this._bindView("/" + sObjectPath);
              }.bind(this)
            );

          // this._fnCreateEditForm();
        },

        /**
         * Binds the view to the object path.
         * @function
         * @param {string} sObjectPath path to the object to be bound
         * @private
         */
        _bindView: function (sObjectPath) {
          var oViewModel = this.getModel("objectView"),
            oDataModel = this.getModel();

          this.getView().bindElement({
            path: sObjectPath,
            events: {
              change: this._onBindingChange.bind(this),
              dataRequested: function () {
                oDataModel.metadataLoaded().then(function () {
                  // Busy indicator on view should only be set if metadata is loaded,
                  // otherwise there may be two busy indications next to each other on the
                  // screen. This happens because route matched handler already calls '_bindView'
                  // while metadata is loaded.
                  oViewModel.setProperty("/busy", true);
                });
              },
              dataReceived: function () {
                oViewModel.setProperty("/busy", false);
              },
            },
          });
        },

        _onBindingChange: function () {
          var oView = this.getView(),
            oViewModel = this.getModel("objectView"),
            oElementBinding = oView.getElementBinding();

          // No data for the binding
          if (!oElementBinding.getBoundContext()) {
            this.getRouter().getTargets().display("objectNotFound");
            return;
          }

          var oResourceBundle = this.getResourceBundle(),
            oObject = oView.getBindingContext().getObject(),
            sObjectId = oObject.ProductID,
            sObjectName = oObject.ProductName;

          oViewModel.setProperty("/busy", false);
          oViewModel.setProperty(
            "/shareSendEmailSubject",
            oResourceBundle.getText("shareSendEmailObjectSubject", [sObjectId])
          );
          oViewModel.setProperty(
            "/shareSendEmailMessage",
            oResourceBundle.getText("shareSendEmailObjectMessage", [
              sObjectName,
              sObjectId,
              location.href,
            ])
          );

          // Update the comments in the list
          // var oList = this.byId("idCommentsList");
          // var oBinding = oList.getBinding("items");
          // oBinding.filter(
          //   new Filter("productID", FilterOperator.EQ, sObjectId)
          // );
        },

        /**
         * Updates the model with the user comments on Products.
         * @function
         * @param {sap.ui.base.Event} oEvent object of the user input
         */
        onPost: function (oEvent) {
          var oFormat = DateFormat.getDateTimeInstance({ style: "medium" });
          var sDate = oFormat.format(new Date());
          var oObject = this.getView().getBindingContext().getObject();
          var sValue = oEvent.getParameter("value");
          var oEntry = {
            productID: oObject.ProductID,
            type: "Comment",
            date: sDate,
            comment: sValue,
          };
          // update model
          var oFeedbackModel = this.getModel("productFeedback");
          var aEntries = oFeedbackModel.getData().productComments;
          aEntries.push(oEntry);
          oFeedbackModel.setData({
            productComments: aEntries,
          });
        },
        onTabChange: function (oEvent) {
          debugger;
          console.log(oEvent);

          var key = oEvent.getSource().getSelectedKey();
          switch (key) {
            case "A":
              this._fnCreateEditForm();
              break;
            case "B":
              this._fnAddEditForm();
              break;
            case "C":
              this._fnAssignOrgForm();
              break;
          }
        },

        _fnCreateEditForm: function () {
          this.byId("idTabCE").insertContent(this._getCreateEditForm());
        },

        _getCreateEditForm: function () {
          if (!this._oCreateEditForm) {
            this._oCreateEditForm = sap.ui.xmlfragment(
              this._getID("CE"),
              "mycompany.myapp.MyWorklistApp.fragments.CreateEditForm",
              this
            );
            this.getView().addDependent(this._oCreateEditForm);
          }
          return this._oCreateEditForm;
        },

        _getID: function (id) {
          return this.createId("idForm" + id);
        },

        _fnAddEditForm: function () {
          this.byId("idTabAE").insertContent(this._getAddEditForm());
        },

        _getAddEditForm: function () {
          if (!this._oAddEditForm) {
            this._oAddEditForm = sap.ui.xmlfragment(
              this._getID("AE"),
              "mycompany.myapp.MyWorklistApp.fragments.AddEditForm",
              this
            );
            this.getView().addDependent(this._oAddEditForm);
          }
          return this._oAddEditForm;
        },

        _fnAssignOrgForm: function () {
          this.byId("idTabAO").insertContent(this._getAssignOrgForm());
        },

        _getAssignOrgForm: function () {
          if (!this._oAssignOrgForm) {
            this._oAssignOrgForm = sap.ui.xmlfragment(
              this._getID("AO"),
              "mycompany.myapp.MyWorklistApp.fragments.AssignOrgForm",
              this
            );
            this.getView().addDependent(this._oAssignOrgForm);
          }
          return this._oAssignOrgForm;
        },

        onUp: function (oEvent) {
          var length = oEvent.getSource().getId().length;
          var index = oEvent
            .getSource()
            .getId()
            .substring(length - 1, length);

          if (index > 0) {
            var oTable = this.getView().byId("idAddEditTable");
            var oModel = oTable.getModel("appModel");
            var oData = oModel.getData();
            var indexValue = oData[index];
            var temp = oData[index - 1];
            oData[parseInt(index) + 1 - 1] = indexValue;
            oData[parseInt(index) + 1] = temp;
            oModel.setData(oData);
          }
        },
        onDown: function (oEvent) {
          debugger;
          var length = oEvent.getSource().getId().length;
          var index = oEvent
            .getSource()
            .getId()
            .substring(length - 1, length);
          var oTable = this.getView().byId("idAddEditTable");
          var oModel = oTable.getModel("appModel");
          var oData = oModel.getData();

          if (index < oData.length - 1) {
            var indexValue = oData[index];
            var temp = oData[parseInt(index) + 1];
            oData[parseInt(index) + 1] = indexValue;
            oData[parseInt(index)] = temp;
            oModel.setData(oData);
          }
        },
        onAddWorkItem: function(oEvent){
          Fragment.byId(this._getID("AE"), "idItem").setValue("");
          Fragment.byId(this._getID("AE"), "idNumber").setValue("");
          // Fragment.byId(this._getID("AE"), "DP1").setValue("");
          // Fragment.byId(this._getID("AE"), "DP2").setValue("");
          Fragment.byId(this._getID("AE"), "idAbsType").setValue("");
          this._getAddEditForm().open();
        },
        onAEFCancel: function(oEvent){
          this._getAddEditForm().close();
        },

        onAOrgForm: function(oEvent){
          Fragment.byId(this._getID("AO"), "idAtt").setValue("");
          // Fragment.byId(this._getID("AO"), "idOrgValue").setSelectedKey("");
          // Fragment.byId(this._getID("AO"), "DP_1").setValue("");
          // Fragment.byId(this._getID("AO"), "DP_2").setValue("");
          this._getAssignOrgForm().open();
        },
        onAssignCancel: function(oEvent){
          this._getAssignOrgForm().close();
        },
        onEditChange: function(oEvent){
          var sPath = oEvent.getParameter('listItems')[0].getBindingContextPath();
          var sData = this.getView().byId('idAddEditTable').getModel('appModel').getProperty(sPath);
          this._getAddEditForm().open();
          Fragment.byId(this._getID("AE"), "idItem").setValue(sData.Name);
          Fragment.byId(this._getID("AE"), "idNumber").setValue(sData.WorkOrder);
          // Fragment.byId(this._getID("AE"), "DP1").setValue(sData.EffectiveFrom);
          // Fragment.byId(this._getID("AE"), "DP2").setValue(sData.EffectiveTo);
          Fragment.byId(this._getID("AE"), "idAbsType").setValue(sData.AbsType);

        },
        onOrgChange: function(oEvent){

          var sPath = oEvent.getParameter('listItems')[0].getBindingContextPath();
          var sData = this.getView().byId('idAssignTable').getModel('assignModel').getProperty(sPath);
          this._getAssignOrgForm().open();
          Fragment.byId(this._getID("AO"), "idAtt").setValue(sData.OrgAtt);
          Fragment.byId(this._getID("AO"), "idOrgValue").setValue(sData.OrgValue);
          // Fragment.byId(this._getID("AO"), "DP_1").setValue(sData.EffectFrom);
          // Fragment.byId(this._getID("AO"), "DP_2").setValue(sData.EffectTo);
        }
      }
    );
  }
);
