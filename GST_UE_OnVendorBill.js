/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N/search', 'N/error', 'N/record', 'N/runtime', 'N/url', 'N/ui/serverWidget'],

	function (search, error, record, runtime, url, serverWidget) {

		/**
		 * Function definition to be triggered before record is loaded.
		 *
		 * @param {Object} scriptContext
		 * @param {Record} scriptContext.newRecord - New record
		 * @param {string} scriptContext.type - Trigger type
		 * @param {Form} scriptContext.form - Current form
		 * @Since 2015.2
		 */
		// Array for list of discount Items...
		var discountItemIds = [];
		var discountAcctIds = [];

		function beforeLoad(scriptContext) {

		}

		/**
		 * Function definition to be triggered before record is loaded.
		 *
		 * @param {Object} scriptContext
		 * @param {Record} scriptContext.newRecord - New record
		 * @param {Record} scriptContext.oldRecord - Old record
		 * @param {string} scriptContext.type - Trigger type
		 * @Since 2015.2
		 */

		var cgst = "cgst";
		var sgst = "sgst";
		var igst = "igst";

		function beforeSubmit(scriptContext) {

			//Get subsidiary value set in the script parameter.
			var scriptObj = runtime.getCurrentScript();

			var getIndiaSubsidiary = [];
			var getSubsidiary = scriptObj.getParameter({
				name: 'custscript_gst_po_ue_indiasubsidiary'
			});
			getIndiaSubsidiary.push(getSubsidiary);
			log.debug('getSubsidiary parameter :- ', getSubsidiary);

			//Variables declared to store the values fetched from the GST Tax Code Matrix for tax code, reversal tax code and reversal items for cgst, sgst and igst.
			var taxCodeId, revSGSTPurchaseItem, revSGSTPayableItem, revCGSTPurchaseItem, revCGSTPayableItem, revIGSTPurchaseItem, revIGSTPayableItem;
			var revTaxCode = '';

			//Current record object.
			var billObject = scriptContext.newRecord;

			var subsidiary = billObject.getValue({
				fieldId: 'subsidiary'
			});
			log.debug("subsidiary: ", subsidiary);

			//If subsidiary matches to India(set as script parameter).
			if (getIndiaSubsidiary && getIndiaSubsidiary.indexOf(subsidiary) != -1) {

				var gstType = billObject.getValue({
					fieldId: 'custbody_gst_gsttype'
				});

				//Item Count.
				var lineItemCount = billObject.getLineCount({
					sublistId: 'item'
				});

				//Expense Count.
				var lineExpenseCount = billObject.getLineCount({
					sublistId: 'expense',
				});

				try {

					var tempCountItem = lineItemCount - 1;
					var tempCountExp = lineExpenseCount - 1;
					var totalCgstAmount = Number(0);
					var totalSgstAmount = Number(0);
					var totalIgstAmount = Number(0);

					//gets the discount item from the function.

					if (scriptContext.type == scriptContext.UserEventType.CREATE) {
						log.debug('Creation time................. ');

						//Loop of items to process for calculating the tax amount,rates etc

						if (lineItemCount > 0 && lineItemCount != null && lineItemCount != '') {

							log.debug("lineItemCount --", lineItemCount);

							for (var i = 0; i < lineItemCount; i++) {

								//Get Reversal check-box value to accordingly calculate the tax amount.
								var isReversal = billObject.getSublistValue({
									sublistId: 'item',
									fieldId: 'custcol_gst_reversal_line',
									line: i
								});
								log.debug('isReversal:-', isReversal);

								var isReversalLine = billObject.getSublistValue({
									sublistId: 'item',
									fieldId: 'custcol_gst_reversal_apply',
									line: i
								});
								log.debug('isReversalLine:-', isReversalLine);

								var reversalProcess = billObject.getSublistValue({
									sublistId: 'item',
									fieldId: 'custcol_gst_reversal_process',
									line: i
								});
								log.debug('reversalProcess:-', reversalProcess);

								//Get other details of lines. Item, Amount and Tax Code.
								var getItem = billObject.getSublistValue({
									sublistId: 'item',
									fieldId: 'item',
									line: i
								});
								log.debug('getItem ', getItem);

								var getAmount = billObject.getSublistValue({
									sublistId: 'item',
									fieldId: 'amount',
									line: i
								});
								log.debug('getAmount ', getAmount);

								var getTaxCode = billObject.getSublistValue({
									sublistId: 'item',
									fieldId: 'taxcode',
									line: i
								});

								//Added on ATN instance
								var getLoc = billObject.getSublistValue({
									sublistId: 'item',
									fieldId: 'location',
									line: i
								});

								var getDept = billObject.getSublistValue({
									sublistId: 'item',
									fieldId: 'department',
									line: i
								});
								//Ended on ATN instance

								//Lookup on item to get the item's schedule id.

								var lookupScheduleId = search.lookupFields({
									type: 'item',
									id: getItem,
									columns: 'custitem_gst_itemschedule'
								});

								if (lookupScheduleId.custitem_gst_itemschedule[0]) {
									var scheduleId = lookupScheduleId.custitem_gst_itemschedule[0].value;
								}

								if ((gstType != '' && gstType != null) && (scheduleId != '' && scheduleId != null)) {

									//Search on GST Tax Code Matrix to get the tax code, reversal tax code, reversal purchase and payable items for cgst, sgst and igst.
									var filterTaxCodeMatrix = new Array();

									filterTaxCodeMatrix.push(search.createFilter({
										name: 'isinactive',
										operator: search.Operator.IS,
										values: false
									}));

									filterTaxCodeMatrix.push(search.createFilter({
										name: 'custrecord_gst_type',
										operator: search.Operator.IS,
										values: gstType
									}));

									filterTaxCodeMatrix.push(search.createFilter({
										name: 'custrecord_gst_item_schedule',
										operator: search.Operator.IS,
										values: scheduleId
									}));


									var columnTaxCodeMatrix = [];

									columnTaxCodeMatrix.push(search.createColumn({
										name: 'custrecord_gst_tax_code'
									}));

									columnTaxCodeMatrix.push(search.createColumn({
										name: 'custrecord_sgst_revpur_item'
									}));

									columnTaxCodeMatrix.push(search.createColumn({
										name: 'custrecord_sgst_revpay_item'
									}));

									columnTaxCodeMatrix.push(search.createColumn({
										name: 'custrecord_cgst_revpur_item'
									}));

									columnTaxCodeMatrix.push(search.createColumn({
										name: 'custrecord_cgst_revpay_item'
									}));

									columnTaxCodeMatrix.push(search.createColumn({
										name: 'custrecord_igst_revpur_item'
									}));

									columnTaxCodeMatrix.push(search.createColumn({
										name: 'custrecord_igst_revpay_item'
									}));

									columnTaxCodeMatrix.push(search.createColumn({
										name: 'custrecord_gst_reversal_taxcode'
									}));

									var searchTaxCodeMatrix = search.create({
										"type": "customrecord_gst_tax_code_matrix",
										"filters": filterTaxCodeMatrix,
										"columns": columnTaxCodeMatrix
									});

									var arraySearchTaxCodeMatrix = searchTaxCodeMatrix.run().getRange({
										start: 0,
										end: 1
									});

									//If search record found. Get the values of tax code, reversal tax code, and all the reversal items of cgst, sgst and igst.
									if (arraySearchTaxCodeMatrix[0] != '' && arraySearchTaxCodeMatrix[0] != null && arraySearchTaxCodeMatrix[0] != undefined && arraySearchTaxCodeMatrix[0] != 'null' && arraySearchTaxCodeMatrix[0] != 'undefined') {

										taxCodeId = arraySearchTaxCodeMatrix[0].getValue('custrecord_gst_tax_code');
										revSGSTPurchaseItem = arraySearchTaxCodeMatrix[0].getValue('custrecord_sgst_revpur_item');
										revSGSTPayableItem = arraySearchTaxCodeMatrix[0].getValue('custrecord_sgst_revpay_item');
										revCGSTPurchaseItem = arraySearchTaxCodeMatrix[0].getValue('custrecord_cgst_revpur_item');
										revCGSTPayableItem = arraySearchTaxCodeMatrix[0].getValue('custrecord_cgst_revpay_item');
										revIGSTPurchaseItem = arraySearchTaxCodeMatrix[0].getValue('custrecord_igst_revpur_item');
										revIGSTPayableItem = arraySearchTaxCodeMatrix[0].getValue('custrecord_igst_revpay_item');
										revTaxCode = arraySearchTaxCodeMatrix[0].getValue('custrecord_gst_reversal_taxcode');

										log.debug("Inside if search record found.", 'taxCodeId ' + taxCodeId + ' revSGSTPurchaseItem ' + revSGSTPurchaseItem + ' revSGSTPayableItem ' + revSGSTPayableItem);
										log.debug("Inside if search record found.", 'revCGSTPurchaseItem ' + revCGSTPurchaseItem + ' revCGSTPayableItem ' + revCGSTPayableItem);
										log.debug("Inside if search record found.", 'revIGSTPurchaseItem ' + revIGSTPurchaseItem + ' revIGSTPayableItem ' + revIGSTPayableItem + ' revTaxCode ' + revTaxCode);

									}
								}

								//Variables declared to store the rates respectively.
								var cgstRate, sgstRate, igstRate;

								//Variable declared to flag gst type as inter or intra. this is done to avoid hard-code of inter and intra id's.
								var isIGST = 'F';

								//Load Tax-group to get the "cgst and sgst" or "igst" rates for reversal calculation.
								var loadTaxGroup = record.load({
									type: record.Type.TAX_GROUP,
									id: taxCodeId
								});

								var taxLineItems = loadTaxGroup.getLineCount({
									sublistId: 'taxitem'
								});

								for (var t = 0; t < taxLineItems; t++) {

									//Get the tax name and split to compare the gst type and get the rate accordingly.
									var taxname = loadTaxGroup.getSublistValue({
										sublistId: 'taxitem',
										fieldId: 'taxname2',
										line: t
									});
									log.debug("taxname:- ", taxname);

									taxname = taxname.split("_");
									taxname = taxname.toLocaleString().toLowerCase().split(',');

									if (taxname.indexOf(cgst) >= 0) {

										cgstRate = loadTaxGroup.getSublistValue({
											sublistId: 'taxitem',
											fieldId: 'rate',
											line: t
										});
										log.debug('cgstRate', cgstRate);

									}

									if (taxname.indexOf(sgst) >= 0) {

										sgstRate = loadTaxGroup.getSublistValue({
											sublistId: 'taxitem',
											fieldId: 'rate',
											line: t
										});
										log.debug('sgstRate', sgstRate);

									}

									if (taxname.indexOf(igst) >= 0) {

										isIGST = 'T';
										igstRate = loadTaxGroup.getSublistValue({
											sublistId: 'taxitem',
											fieldId: 'rate',
											line: t
										});
										log.debug('igstRate', igstRate);


									}

								}

								log.debug('isIGST', isIGST);

								//Calculate CGST, SGST and IGST amount to be set on the line.
								//Total is calculated of all the lines to be set on total CGST, SGST and IGST fields for print.
								if (isIGST == 'T' || isIGST == "T") {

									var purchaseAmountigst = getAmount * (igstRate / 100);
									var negativeAmountigst = -purchaseAmountigst;

									totalIgstAmount = Number(totalIgstAmount) + Number(purchaseAmountigst);
									log.debug("totalIgstAmount:- ", totalIgstAmount);

								} else if (isIGST == 'F' || isIGST == "F") {

									var purchaseAmountcgst = getAmount * (cgstRate / 100);
									var negativeAmountcgst = -purchaseAmountcgst;

									var purchaseAmountsgst = getAmount * (sgstRate / 100);
									var negativeAmountsgst = -purchaseAmountsgst;

									totalCgstAmount = Number(totalCgstAmount) + Number(purchaseAmountcgst);
									totalSgstAmount = Number(totalSgstAmount) + Number(purchaseAmountsgst);

								}

								//If reversal check-box is checked the reversal calculations to be done.
								if (isReversal == true && reversalProcess == false) {

									log.debug("reversal is true");

									billObject.setSublistValue({
										sublistId: 'item',
										fieldId: 'taxcode',
										line: i,
										value: revTaxCode
									});
									log.debug("revTaxCode:- ", revTaxCode);

									billObject.setSublistValue({
										sublistId: 'item',
										fieldId: 'custcol_gst_reversal_process',
										line: i,
										value: true
									});


									//If isIGST is true - GST type is considered as Inter.
									if (isIGST == 'T' || isIGST == "T") {

										log.debug('tempCountItem', tempCountItem);
										log.debug('tempCountItem+1', tempCountItem + 1);

										//Set IGST Purchase Item and Calculated IGST Rate and Amount.
										billObject.setSublistValue({
											sublistId: 'item',
											fieldId: 'item',
											line: tempCountItem + 1,
											value: revIGSTPurchaseItem
										});
										billObject.setSublistValue({
											sublistId: 'item',
											fieldId: 'rate',
											line: tempCountItem + 1,
											value: purchaseAmountigst
										});
										billObject.setSublistValue({
											sublistId: 'item',
											fieldId: 'amount',
											line: tempCountItem + 1,
											value: purchaseAmountigst
										});
										billObject.setSublistValue({
											sublistId: 'item',
											fieldId: 'taxcode',
											line: tempCountItem + 1,
											value: revTaxCode
										});
										billObject.setSublistValue({
											sublistId: 'item',
											fieldId: 'custcol_gst_reversal_apply',
											line: tempCountItem + 1,
											value: true
										});
										billObject.setSublistValue({ //Added location...
											sublistId: 'item',
											fieldId: 'location',
											line: tempCountItem + 1,
											value: getLoc
										});
										billObject.setSublistValue({ //Added Department...
											sublistId: 'item',
											fieldId: 'department',
											line: tempCountItem + 1,
											value: getDept
										});


										billObject.setSublistValue({
											sublistId: 'item',
											fieldId: 'custcol_gst_igstrate',
											line: tempCountItem + 1,
											value: igstRate
										});
										billObject.setSublistValue({
											sublistId: 'item',
											fieldId: 'custcol_gst_igstamount',
											line: tempCountItem + 1,
											value: purchaseAmountigst
										});
										billObject.setSublistValue({
											sublistId: 'item',
											fieldId: 'custcol_gst_cgstrate',
											line: tempCountItem + 1,
											value: 0
										});
										billObject.setSublistValue({
											sublistId: 'item',
											fieldId: 'custcol_gst_cgstamount',
											line: tempCountItem + 1,
											value: 0
										});
										billObject.setSublistValue({
											sublistId: 'item',
											fieldId: 'custcol_gst_sgstrate',
											line: tempCountItem + 1,
											value: 0
										});
										billObject.setSublistValue({
											sublistId: 'item',
											fieldId: 'custcol_gst_sgstamount',
											line: tempCountItem + 1,
											value: 0
										});

										//Set IGST Payable Item and Calculated Negative IGST Rate and Amount.
										billObject.setSublistValue({
											sublistId: 'item',
											fieldId: 'item',
											line: tempCountItem + 2,
											value: revIGSTPayableItem
										});
										billObject.setSublistValue({
											sublistId: 'item',
											fieldId: 'rate',
											line: tempCountItem + 2,
											value: negativeAmountigst
										});
										billObject.setSublistValue({
											sublistId: 'item',
											fieldId: 'amount',
											line: tempCountItem + 2,
											value: negativeAmountigst
										});
										billObject.setSublistValue({
											sublistId: 'item',
											fieldId: 'taxcode',
											line: tempCountItem + 2,
											value: revTaxCode
										});
										billObject.setSublistValue({
											sublistId: 'item',
											fieldId: 'custcol_gst_reversal_apply',
											line: tempCountItem + 2,
											value: true
										});

										billObject.setSublistValue({ //Added location...
											sublistId: 'item',
											fieldId: 'location',
											line: tempCountItem + 2,
											value: getLoc
										});
										billObject.setSublistValue({ //Added Department...
											sublistId: 'item',
											fieldId: 'department',
											line: tempCountItem + 2,
											value: getDept
										});

										billObject.setSublistValue({
											sublistId: 'item',
											fieldId: 'custcol_gst_igstrate',
											line: tempCountItem + 2,
											value: igstRate
										});
										billObject.setSublistValue({
											sublistId: 'item',
											fieldId: 'custcol_gst_igstamount',
											line: tempCountItem + 2,
											value: purchaseAmountigst
										});
										billObject.setSublistValue({
											sublistId: 'item',
											fieldId: 'custcol_gst_cgstrate',
											line: tempCountItem + 2,
											value: 0
										});
										billObject.setSublistValue({
											sublistId: 'item',
											fieldId: 'custcol_gst_cgstamount',
											line: tempCountItem + 2,
											value: 0
										});
										billObject.setSublistValue({
											sublistId: 'item',
											fieldId: 'custcol_gst_sgstrate',
											line: tempCountItem + 2,
											value: 0
										});
										billObject.setSublistValue({
											sublistId: 'item',
											fieldId: 'custcol_gst_sgstamount',
											line: tempCountItem + 2,
											value: 0
										});

										tempCountItem = tempCountItem + 2;

									}
									//If isIGST is false - GST Type is considered as Intra.
									else if (isIGST == 'F' || isIGST == "F") {

										//Set SGST Purchase Item and Calculated SGST Rate and Amount.
										billObject.setSublistValue({
											sublistId: 'item',
											fieldId: 'item',
											line: tempCountItem + 1,
											value: revSGSTPurchaseItem
										});
										billObject.setSublistValue({
											sublistId: 'item',
											fieldId: 'rate',
											line: tempCountItem + 1,
											value: purchaseAmountsgst
										});
										billObject.setSublistValue({
											sublistId: 'item',
											fieldId: 'amount',
											line: tempCountItem + 1,
											value: purchaseAmountsgst
										});
										billObject.setSublistValue({
											sublistId: 'item',
											fieldId: 'taxcode',
											line: tempCountItem + 1,
											value: revTaxCode
										});
										billObject.setSublistValue({
											sublistId: 'item',
											fieldId: 'custcol_gst_sgstrate',
											line: tempCountItem + 1,
											value: sgstRate
										});
										billObject.setSublistValue({
											sublistId: 'item',
											fieldId: 'custcol_gst_sgstamount',
											line: tempCountItem + 1,
											value: purchaseAmountsgst
										});
										billObject.setSublistValue({
											sublistId: 'item',
											fieldId: 'custcol_gst_cgstrate',
											line: tempCountItem + 1,
											value: 0
										});
										billObject.setSublistValue({
											sublistId: 'item',
											fieldId: 'custcol_gst_cgstamount',
											line: tempCountItem + 1,
											value: 0
										});
										billObject.setSublistValue({
											sublistId: 'item',
											fieldId: 'custcol_gst_igstrate',
											line: tempCountItem + 1,
											value: 0
										});
										billObject.setSublistValue({
											sublistId: 'item',
											fieldId: 'custcol_gst_igstamount',
											line: tempCountItem + 1,
											value: 0
										});
										billObject.setSublistValue({
											sublistId: 'item',
											fieldId: 'custcol_gst_reversal_apply',
											line: tempCountItem + 1,
											value: true
										});
										billObject.setSublistValue({ //Added location...
											sublistId: 'item',
											fieldId: 'location',
											line: tempCountItem + 1,
											value: getLoc
										});
										billObject.setSublistValue({ //Added Department...
											sublistId: 'item',
											fieldId: 'department',
											line: tempCountItem + 1,
											value: getDept
										});

										//Set SGST Payable Item and Calculated Negative SGST Rate and Amount.
										billObject.setSublistValue({
											sublistId: 'item',
											fieldId: 'item',
											line: tempCountItem + 2,
											value: revSGSTPayableItem
										});
										billObject.setSublistValue({
											sublistId: 'item',
											fieldId: 'rate',
											line: tempCountItem + 2,
											value: negativeAmountsgst
										});
										billObject.setSublistValue({
											sublistId: 'item',
											fieldId: 'amount',
											line: tempCountItem + 2,
											value: negativeAmountsgst
										});
										billObject.setSublistValue({
											sublistId: 'item',
											fieldId: 'taxcode',
											line: tempCountItem + 2,
											value: revTaxCode
										});
										billObject.setSublistValue({
											sublistId: 'item',
											fieldId: 'custcol_gst_sgstrate',
											line: tempCountItem + 2,
											value: sgstRate
										});
										billObject.setSublistValue({
											sublistId: 'item',
											fieldId: 'custcol_gst_sgstamount',
											line: tempCountItem + 2,
											value: purchaseAmountsgst
										});
										billObject.setSublistValue({
											sublistId: 'item',
											fieldId: 'custcol_gst_cgstrate',
											line: tempCountItem + 2,
											value: 0
										});
										billObject.setSublistValue({
											sublistId: 'item',
											fieldId: 'custcol_gst_cgstamount',
											line: tempCountItem + 2,
											value: 0
										});
										billObject.setSublistValue({
											sublistId: 'item',
											fieldId: 'custcol_gst_igstrate',
											line: tempCountItem + 2,
											value: 0
										});
										billObject.setSublistValue({
											sublistId: 'item',
											fieldId: 'custcol_gst_igstamount',
											line: tempCountItem + 2,
											value: 0
										});
										billObject.setSublistValue({
											sublistId: 'item',
											fieldId: 'custcol_gst_reversal_apply',
											line: tempCountItem + 2,
											value: true
										});
										billObject.setSublistValue({ //Added location...
											sublistId: 'item',
											fieldId: 'location',
											line: tempCountItem + 2,
											value: getLoc
										});
										billObject.setSublistValue({ //Added Department...
											sublistId: 'item',
											fieldId: 'department',
											line: tempCountItem + 2,
											value: getDept
										});

										//Set CGST Purchase Item and Calculated CGST Rate and Amount.
										billObject.setSublistValue({
											sublistId: 'item',
											fieldId: 'item',
											line: tempCountItem + 3,
											value: revCGSTPurchaseItem
										});
										billObject.setSublistValue({
											sublistId: 'item',
											fieldId: 'rate',
											line: tempCountItem + 3,
											value: purchaseAmountcgst
										});
										billObject.setSublistValue({
											sublistId: 'item',
											fieldId: 'amount',
											line: tempCountItem + 3,
											value: purchaseAmountcgst
										});
										billObject.setSublistValue({
											sublistId: 'item',
											fieldId: 'taxcode',
											line: tempCountItem + 3,
											value: revTaxCode
										});
										billObject.setSublistValue({
											sublistId: 'item',
											fieldId: 'custcol_gst_cgstrate',
											line: tempCountItem + 3,
											value: cgstRate
										});
										billObject.setSublistValue({
											sublistId: 'item',
											fieldId: 'custcol_gst_cgstamount',
											line: tempCountItem + 3,
											value: purchaseAmountcgst
										});
										billObject.setSublistValue({
											sublistId: 'item',
											fieldId: 'custcol_gst_sgstrate',
											line: tempCountItem + 3,
											value: 0
										});
										billObject.setSublistValue({
											sublistId: 'item',
											fieldId: 'custcol_gst_sgstamount',
											line: tempCountItem + 3,
											value: 0
										});
										billObject.setSublistValue({
											sublistId: 'item',
											fieldId: 'custcol_gst_igstrate',
											line: tempCountItem + 3,
											value: 0
										});
										billObject.setSublistValue({
											sublistId: 'item',
											fieldId: 'custcol_gst_igstamount',
											line: tempCountItem + 3,
											value: 0
										});
										billObject.setSublistValue({
											sublistId: 'item',
											fieldId: 'custcol_gst_reversal_apply',
											line: tempCountItem + 3,
											value: true
										});
										billObject.setSublistValue({ //Added location...
											sublistId: 'item',
											fieldId: 'location',
											line: tempCountItem + 3,
											value: getLoc
										});
										billObject.setSublistValue({ //Added Department...
											sublistId: 'item',
											fieldId: 'department',
											line: tempCountItem + 3,
											value: getDept
										});

										//Set CGST Payable Item and Calculated Negative CGST Rate and Amount.
										billObject.setSublistValue({
											sublistId: 'item',
											fieldId: 'item',
											line: tempCountItem + 4,
											value: revCGSTPayableItem
										});
										billObject.setSublistValue({
											sublistId: 'item',
											fieldId: 'rate',
											line: tempCountItem + 4,
											value: negativeAmountcgst
										});
										billObject.setSublistValue({
											sublistId: 'item',
											fieldId: 'amount',
											line: tempCountItem + 4,
											value: negativeAmountcgst
										});
										billObject.setSublistValue({
											sublistId: 'item',
											fieldId: 'taxcode',
											line: tempCountItem + 4,
											value: revTaxCode
										});
										billObject.setSublistValue({
											sublistId: 'item',
											fieldId: 'custcol_gst_cgstrate',
											line: tempCountItem + 4,
											value: cgstRate
										});
										billObject.setSublistValue({
											sublistId: 'item',
											fieldId: 'custcol_gst_cgstamount',
											line: tempCountItem + 4,
											value: purchaseAmountcgst
										});
										billObject.setSublistValue({
											sublistId: 'item',
											fieldId: 'custcol_gst_sgstrate',
											line: tempCountItem + 4,
											value: 0
										});
										billObject.setSublistValue({
											sublistId: 'item',
											fieldId: 'custcol_gst_sgstamount',
											line: tempCountItem + 4,
											value: 0
										});
										billObject.setSublistValue({
											sublistId: 'item',
											fieldId: 'custcol_gst_igstrate',
											line: tempCountItem + 4,
											value: 0
										});
										billObject.setSublistValue({
											sublistId: 'item',
											fieldId: 'custcol_gst_igstamount',
											line: tempCountItem + 4,
											value: 0
										});
										billObject.setSublistValue({
											sublistId: 'item',
											fieldId: 'custcol_gst_reversal_apply',
											line: tempCountItem + 4,
											value: true
										});
										billObject.setSublistValue({ //Added location...
											sublistId: 'item',
											fieldId: 'location',
											line: tempCountItem + 4,
											value: getLoc
										});
										billObject.setSublistValue({ //Added Department...
											sublistId: 'item',
											fieldId: 'department',
											line: tempCountItem + 4,
											value: getDept
										});

										tempCountItem = tempCountItem + 4;

									}
								}

								//Else set the tax-code id received as is to the tax code field.
								else if (isReversal == false && isReversalLine == false) {

									if (isIGST == 'T' || isIGST == "T") {
										//Set the IGST rate and calculated amount for the item selected.

										billObject.setSublistValue({
											sublistId: 'item',
											fieldId: 'taxcode',
											line: i,
											value: taxCodeId
										});
										billObject.setSublistValue({
											sublistId: 'item',
											fieldId: 'custcol_gst_igstrate',
											line: i,
											value: igstRate
										});
										billObject.setSublistValue({
											sublistId: 'item',
											fieldId: 'custcol_gst_igstamount',
											line: i,
											value: purchaseAmountigst
										});
										billObject.setSublistValue({
											sublistId: 'item',
											fieldId: 'custcol_gst_cgstrate',
											line: i,
											value: 0
										});
										billObject.setSublistValue({
											sublistId: 'item',
											fieldId: 'custcol_gst_cgstamount',
											line: i,
											value: 0
										});
										billObject.setSublistValue({
											sublistId: 'item',
											fieldId: 'custcol_gst_sgstrate',
											line: i,
											value: 0
										});
										billObject.setSublistValue({
											sublistId: 'item',
											fieldId: 'custcol_gst_sgstamount',
											line: i,
											value: 0
										});

									} else if (isIGST == 'F' || isIGST == "F") {

										//Set the cgst and sgst rate and amount for the item selected.
										billObject.setSublistValue({
											sublistId: 'item',
											fieldId: 'taxcode',
											line: i,
											value: taxCodeId
										});
										billObject.setSublistValue({
											sublistId: 'item',
											fieldId: 'custcol_gst_cgstrate',
											line: i,
											value: cgstRate
										});
										billObject.setSublistValue({
											sublistId: 'item',
											fieldId: 'custcol_gst_cgstamount',
											line: i,
											value: purchaseAmountcgst
										});
										billObject.setSublistValue({
											sublistId: 'item',
											fieldId: 'custcol_gst_sgstrate',
											line: i,
											value: sgstRate
										});
										billObject.setSublistValue({
											sublistId: 'item',
											fieldId: 'custcol_gst_sgstamount',
											line: i,
											value: purchaseAmountsgst
										});
										billObject.setSublistValue({
											sublistId: 'item',
											fieldId: 'custcol_gst_igstrate',
											line: i,
											value: 0
										});
										billObject.setSublistValue({
											sublistId: 'item',
											fieldId: 'custcol_gst_igstamount',
											line: i,
											value: 0
										});

									}

								}
							}
						}

						//On create .. bs on expense

						//Loop of expenses to process for calculating the tax amount,rates etc
						if (lineExpenseCount > 0 && lineExpenseCount != null && lineExpenseCount != '') {

							log.debug("lineExpenseCount:-", lineExpenseCount);

							//get igst,cgst,sgst rates and amount from the Expense line level...
							for (var p = 0; p < lineExpenseCount; p++) {

								//Get Reversal check-box value on expense to accordingly calculate the tax amount.
								var isReversal = billObject.getSublistValue({
									sublistId: 'expense',
									fieldId: 'custcol_gst_reversal_line',
									line: p
								});
								log.debug('exp isReversal:-', isReversal);

								var isReversalLine = billObject.getSublistValue({
									sublistId: 'expense',
									fieldId: 'custcol_gst_reversal_apply',
									line: p
								});
								log.debug('exp isReversalLine:-', isReversalLine);

								var reversalProcess = billObject.getSublistValue({
									sublistId: 'expense',
									fieldId: 'custcol_gst_reversal_process',
									line: p
								});
								log.debug('exp reversalProcess:-', reversalProcess);

								var expCategory = billObject.getSublistValue({
									sublistId: 'expense',
									fieldId: 'category',
									line: p
								});
								log.debug('expense category - ', expCategory);

								var accountId = billObject.getSublistValue({
									sublistId: 'expense',
									fieldId: 'account',
									line: p
								});
								log.debug(' exp account Id - ', accountId);

								var getAmount = billObject.getSublistValue({
									sublistId: 'expense',
									fieldId: 'amount',
									line: p
								});
								log.debug('exp amount - ', getAmount);

								var getTaxCode = billObject.getSublistValue({
									sublistId: 'expense',
									fieldId: 'taxcode',
									line: p
								});
								log.debug('exp TaxCode - ', getTaxCode);

								var getDept = billObject.getSublistValue({
									sublistId: 'expense',
									fieldId: 'department',
									line: p
								});
								log.debug('exp amount - ', getAmount);


								//Lookup on item to get the Expense Category's schedule id.
								if (expCategory != null && expCategory != '') {
									var lookupScheduleId = search.lookupFields({
										type: 'expensecategory',
										id: expCategory,
										columns: 'custrecord_gst_expenseschedule'
									});
									log.debug('exp category scheduleId - ', lookupScheduleId);

									if (lookupScheduleId.custrecord_gst_expenseschedule[0]) {
										var scheduleId = lookupScheduleId.custrecord_gst_expenseschedule[0].value;
									}
									log.debug('exp scheduleId - ', scheduleId);

								}

								//Search on GST Tax Code Matrix to get the tax code, reversal tax code, reversal purchase and payable items for cgst, sgst and igst.
								if ((gstType != '' && gstType != null) && (scheduleId != '' && scheduleId != null)) {
									var filterTaxCodeMatrix = new Array();

									filterTaxCodeMatrix.push(search.createFilter({
										name: 'isinactive',
										operator: search.Operator.IS,
										values: false
									}));

									filterTaxCodeMatrix.push(search.createFilter({
										name: 'custrecord_gst_type',
										operator: search.Operator.IS,
										values: gstType
									}));

									filterTaxCodeMatrix.push(search.createFilter({
										name: 'custrecord_gst_item_schedule',
										operator: search.Operator.IS,
										values: scheduleId
									}));

									var columnTaxCodeMatrix = new Array();

									columnTaxCodeMatrix.push(search.createColumn({
										name: 'custrecord_gst_tax_code'
									}));

									columnTaxCodeMatrix.push(search.createColumn({
										name: 'custrecord_sgst_revpur_item'
									}));

									columnTaxCodeMatrix.push(search.createColumn({
										name: 'custrecord_sgst_revpay_item'
									}));

									columnTaxCodeMatrix.push(search.createColumn({
										name: 'custrecord_cgst_revpur_item'
									}));

									columnTaxCodeMatrix.push(search.createColumn({
										name: 'custrecord_cgst_revpay_item'
									}));

									columnTaxCodeMatrix.push(search.createColumn({
										name: 'custrecord_igst_revpur_item'
									}));

									columnTaxCodeMatrix.push(search.createColumn({
										name: 'custrecord_igst_revpay_item'
									}));

									columnTaxCodeMatrix.push(search.createColumn({
										name: 'custrecord_gst_reversal_taxcode'
									}));

									var searchTaxCodeMatrix = search.create({
										"type": "customrecord_gst_tax_code_matrix",
										"filters": filterTaxCodeMatrix,
										"columns": columnTaxCodeMatrix
									});

									var arraySearchTaxCodeMatrix = searchTaxCodeMatrix.run().getRange({
										start: 0,
										end: 1
									});

									//If search record found. Get the values of tax code, reversal tax code, and all the reversal items of cgst, sgst and igst.
									if (arraySearchTaxCodeMatrix[0] != '' && arraySearchTaxCodeMatrix[0] != null && arraySearchTaxCodeMatrix[0] != undefined && arraySearchTaxCodeMatrix[0] != 'null' && arraySearchTaxCodeMatrix[0] != 'undefined') {

										taxCodeId = arraySearchTaxCodeMatrix[0].getValue('custrecord_gst_tax_code'); //Tax code
										revSGSTPurchaseItem = arraySearchTaxCodeMatrix[0].getValue('custrecord_sgst_revpur_item');
										revSGSTPayableItem = arraySearchTaxCodeMatrix[0].getValue('custrecord_sgst_revpay_item');
										revCGSTPurchaseItem = arraySearchTaxCodeMatrix[0].getValue('custrecord_cgst_revpur_item');
										revCGSTPayableItem = arraySearchTaxCodeMatrix[0].getValue('custrecord_cgst_revpay_item');
										revIGSTPurchaseItem = arraySearchTaxCodeMatrix[0].getValue('custrecord_igst_revpur_item');
										revIGSTPayableItem = arraySearchTaxCodeMatrix[0].getValue('custrecord_igst_revpay_item');
										revTaxCode = arraySearchTaxCodeMatrix[0].getValue('custrecord_gst_reversal_taxcode');

										log.debug("Inside if search record found on before load.", 'exp taxCodeId ' + taxCodeId + ' exp revSGSTPurchaseItem ' + revSGSTPurchaseItem + 'exp revSGSTPayableItem ' + revSGSTPayableItem);
										log.debug("Inside if search record found on before load.", 'exp revCGSTPurchaseItem ' + revCGSTPurchaseItem + ' exp revCGSTPayableItem ' + revCGSTPayableItem);
										log.debug("Inside if search record found on before load.", 'exp revIGSTPurchaseItem ' + revIGSTPurchaseItem + ' exp revIGSTPayableItem ' + revIGSTPayableItem + ' exp revTaxCode ' + revTaxCode);
									}
								}

								//gets the Exp Account from items to set the line level of expense tab while reversal apply.
								if (revSGSTPurchaseItem) {

									var expAcctSGSTPurchase = search.lookupFields({
										type: 'item',
										id: revSGSTPurchaseItem,
										columns: 'expenseaccount'
									});

									if (expAcctSGSTPurchase) {
										var expAcctSGSTPurchaseAcctID = expAcctSGSTPurchase.expenseaccount[0].value;
										log.debug('SGST pur acct ID', expAcctSGSTPurchaseAcctID);


									}
								}
								if (revSGSTPayableItem) {
									var expAcctSGSTPayable = search.lookupFields({
										type: 'item',
										id: revSGSTPayableItem,
										columns: 'expenseaccount'
									});

									if (expAcctSGSTPayable) {
										var expAcctSGSTPayableAcctID = expAcctSGSTPayable.expenseaccount[0].value;
										log.debug('SGST pay acct ID', expAcctSGSTPayableAcctID);


									}
								}

								if (revCGSTPurchaseItem) {

									var expAcctCGSTPurchase = search.lookupFields({
										type: 'item',
										id: revCGSTPurchaseItem,
										columns: 'expenseaccount'
									});

									if (expAcctCGSTPurchase) {
										var expAcctCGSTPurchaseAcctID = expAcctCGSTPurchase.expenseaccount[0].value;
										log.debug('CGST pur acct ID', expAcctCGSTPurchaseAcctID);
									}
								}

								if (revCGSTPayableItem) {

									var expAcctCGSTPayable = search.lookupFields({
										type: 'item',
										id: revCGSTPayableItem,
										columns: 'expenseaccount'
									});
									if (expAcctCGSTPayable) {
										var expAcctCGSTPayableAcctID = expAcctCGSTPayable.expenseaccount[0].value;
										log.debug('CGST pay acct ID', expAcctCGSTPayableAcctID);
									}
								}

								if (revIGSTPurchaseItem) {

									var expAcctIGSTPurchase = search.lookupFields({
										type: 'item',
										id: revIGSTPurchaseItem,
										columns: 'expenseaccount'
									});
									if (expAcctIGSTPurchase) {
										var expAcctIGSTPurchaseAcctID = expAcctIGSTPurchase.expenseaccount[0].value;
										log.debug('IGST pur acct ID', expAcctIGSTPurchaseAcctID);


									}
								}

								if (revIGSTPayableItem) {

									var expAcctIGSTPayable = search.lookupFields({
										type: 'item',
										id: revIGSTPayableItem,
										columns: 'expenseaccount'
									});
									if (expAcctIGSTPayable) {
										var expAcctIGSTPayableAcctID = expAcctIGSTPayable.expenseaccount[0].value;
										log.debug('IGST pay acct ID', expAcctIGSTPayableAcctID);


									}
								}


								//Variables declared to store the rates respectively.
								var cgstRate, sgstRate, igstRate;

								//Variable declared to flag gst type as inter or intra. this is done to avoid hard-code of inter and intra id's.
								var isIGST = 'F';

								//Load Tax-group to get the "cgst and sgst" or "igst" rates for reversal calculation.
								var loadTaxGroup = record.load({
									type: record.Type.TAX_GROUP,
									id: taxCodeId
								});

								var taxLineItems = loadTaxGroup.getLineCount({
									sublistId: 'taxitem'
								});

								for (var t = 0; t < taxLineItems; t++) {

									//Get the tax name and split to compare the gst type and get the rate accordingly.
									var taxname = loadTaxGroup.getSublistValue({
										sublistId: 'taxitem',
										fieldId: 'taxname2',
										line: t
									});
									log.debug("exp taxname:- ", taxname);

									taxname = taxname.split("_");
									taxname = taxname.toLocaleString().toLowerCase().split(',');

									//Gets the CGST rate
									if (taxname.indexOf(cgst) >= 0) {

										cgstRate = loadTaxGroup.getSublistValue({
											sublistId: 'taxitem',
											fieldId: 'rate',
											line: t
										});
										log.debug('exp cgstRate', cgstRate);

									}

									//Gets the SGST rate
									if (taxname.indexOf(sgst) >= 0) {

										sgstRate = loadTaxGroup.getSublistValue({
											sublistId: 'taxitem',
											fieldId: 'rate',
											line: t
										});
										log.debug('exp sgstRate', sgstRate);

									}

									//Gets the IGST rate
									if (taxname.indexOf(igst) >= 0) {

										isIGST = 'T';
										igstRate = loadTaxGroup.getSublistValue({
											sublistId: 'taxitem',
											fieldId: 'rate',
											line: t
										});
										log.debug('exp igstRate', igstRate);


									}

								}

								log.debug('exp bs isIGST', isIGST);
								//Total is calculated of all the lines to be set on total CGST, SGST and IGST fields for print.
								if (isIGST == 'T' || isIGST == "T") {
									log.debug('if bs isIGST', isIGST);

									var purchaseAmountigst = getAmount * (igstRate / 100);
									var negativeAmountigst = -purchaseAmountigst;

									totalIgstAmount = Number(totalIgstAmount) + Number(purchaseAmountigst);
									log.debug("totalIgstAmount:- ", totalIgstAmount);

								} else if (isIGST == 'F' || isIGST == "F") {
									log.debug('else bs isIGST', isIGST);
									var purchaseAmountcgst = getAmount * (cgstRate / 100);
									var negativeAmountcgst = -purchaseAmountcgst;

									var purchaseAmountsgst = getAmount * (sgstRate / 100);
									var negativeAmountsgst = -purchaseAmountsgst;

									totalCgstAmount = Number(totalCgstAmount) + Number(purchaseAmountcgst);
									totalSgstAmount = Number(totalSgstAmount) + Number(purchaseAmountsgst);

								}

								//On Expense, If reversal check-box is checked the reversal calculations to be done.
								if (isReversal == true && reversalProcess == false) {

									log.debug("reversal is true on expense");

									billObject.setSublistValue({
										sublistId: 'expense',
										fieldId: 'taxcode',
										line: p,
										value: revTaxCode
									});
									log.debug("exp revTaxCode:- ", revTaxCode);

									billObject.setSublistValue({
										sublistId: 'expense',
										fieldId: 'custcol_gst_reversal_process',
										line: p,
										value: true
									});

									//If isIGST is true - GST type is considered as Inter.
									if (isIGST == 'T' || isIGST == "T") {

										log.debug('tempCountExp', tempCountExp);
										log.debug('tempCountExp+1', tempCountExp + 1);

										//Set IGST Purchase Item and Calculated IGST Rate and Amount.
										/*    billObject.setSublistValue({
										        sublistId: 'expense',
										        fieldId: 'category',
										        line: tempCountExp + 1,
										        value: revIGSTPurchaseItem   //1
										    });*/

										billObject.setSublistValue({
											sublistId: 'expense',
											fieldId: 'account',
											line: tempCountExp + 1,
											value: expAcctIGSTPurchaseAcctID
										});


										billObject.setSublistValue({
											sublistId: 'expense',
											fieldId: 'rate',
											line: tempCountExp + 1,
											value: purchaseAmountigst
										});

										billObject.setSublistValue({
											sublistId: 'expense',
											fieldId: 'amount',
											line: tempCountExp + 1,
											value: purchaseAmountigst
										});

										billObject.setSublistValue({
											sublistId: 'expense',
											fieldId: 'taxcode',
											line: tempCountExp + 1,
											value: revTaxCode
										});

										billObject.setSublistValue({
											sublistId: 'expense',
											fieldId: 'custcol_gst_reversal_apply',
											line: tempCountExp + 1,
											value: true
										});

										billObject.setSublistValue({ //Added location...
											sublistId: 'expense',
											fieldId: 'location',
											line: tempCountExp + 1,
											value: getLoc
										});

										billObject.setSublistValue({ //Added Department...
											sublistId: 'expense',
											fieldId: 'department',
											line: tempCountExp + 1,
											value: getDept
										});


										billObject.setSublistValue({
											sublistId: 'expense',
											fieldId: 'custcol_gst_igstrate',
											line: tempCountExp + 1,
											value: igstRate
										});
										billObject.setSublistValue({
											sublistId: 'expense',
											fieldId: 'custcol_gst_igstamount',
											line: tempCountExp + 1,
											value: purchaseAmountigst
										});
										billObject.setSublistValue({
											sublistId: 'expense',
											fieldId: 'custcol_gst_cgstrate',
											line: tempCountExp + 1,
											value: 0
										});
										billObject.setSublistValue({
											sublistId: 'expense',
											fieldId: 'custcol_gst_cgstamount',
											line: tempCountExp + 1,
											value: 0
										});
										billObject.setSublistValue({
											sublistId: 'expense',
											fieldId: 'custcol_gst_sgstrate',
											line: tempCountExp + 1,
											value: 0
										});
										billObject.setSublistValue({
											sublistId: 'expense',
											fieldId: 'custcol_gst_sgstamount',
											line: tempCountExp + 1,
											value: 0
										});

										//Set IGST Payable Item and Calculated Negative IGST Rate and Amount.
										/*  billObject.setSublistValue({
										      sublistId: 'expense',
										      fieldId: 'category',
										      line: tempCountExp + 2,
										      value: revIGSTPayableItem
										  });*/

										billObject.setSublistValue({
											sublistId: 'expense',
											fieldId: 'account',
											line: tempCountExp + 2,
											value: expAcctIGSTPayableAcctID //2 IGST Payable
										});

										billObject.setSublistValue({
											sublistId: 'expense',
											fieldId: 'rate',
											line: tempCountExp + 2,
											value: negativeAmountigst
										});
										billObject.setSublistValue({
											sublistId: 'expense',
											fieldId: 'amount',
											line: tempCountExp + 2,
											value: negativeAmountigst
										});
										billObject.setSublistValue({
											sublistId: 'expense',
											fieldId: 'taxcode',
											line: tempCountExp + 2,
											value: revTaxCode
										});
										billObject.setSublistValue({
											sublistId: 'expense',
											fieldId: 'custcol_gst_reversal_apply',
											line: tempCountExp + 2,
											value: true
										});

										billObject.setSublistValue({ //Added location...
											sublistId: 'expense',
											fieldId: 'location',
											line: tempCountExp + 2,
											value: getLoc
										});
										billObject.setSublistValue({ //Added Department...
											sublistId: 'expense',
											fieldId: 'department',
											line: tempCountExp + 2,
											value: getDept
										});


										billObject.setSublistValue({
											sublistId: 'expense',
											fieldId: 'custcol_gst_igstrate',
											line: tempCountExp + 2,
											value: igstRate
										});
										billObject.setSublistValue({
											sublistId: 'expense',
											fieldId: 'custcol_gst_igstamount',
											line: tempCountExp + 2,
											value: purchaseAmountigst
										});
										billObject.setSublistValue({
											sublistId: 'expense',
											fieldId: 'custcol_gst_cgstrate',
											line: tempCountExp + 2,
											value: 0
										});
										billObject.setSublistValue({
											sublistId: 'expense',
											fieldId: 'custcol_gst_cgstamount',
											line: tempCountExp + 2,
											value: 0
										});
										billObject.setSublistValue({
											sublistId: 'expense',
											fieldId: 'custcol_gst_sgstrate',
											line: tempCountExp + 2,
											value: 0
										});
										billObject.setSublistValue({
											sublistId: 'expense',
											fieldId: 'custcol_gst_sgstamount',
											line: tempCountExp + 2,
											value: 0
										});

										tempCountExp = tempCountExp + 2;

									}
									//If isIGST is false - GST Type is considered as Intra.
									else if (isIGST == 'F' || isIGST == "F") {

										//Set SGST Purchase Item and Calculated SGST Rate and Amount.
										/*    billObject.setSublistValue({
										        sublistId: 'expense',
										        fieldId: 'category',
										        line: tempCountExp + 1,
										        value: revSGSTPurchaseItem
										    });*/

										billObject.setSublistValue({
											sublistId: 'expense',
											fieldId: 'account',
											line: tempCountExp + 1,
											value: expAcctSGSTPurchaseAcctID //2 SGST Purchase
										});

										billObject.setSublistValue({
											sublistId: 'expense',
											fieldId: 'rate',
											line: tempCountExp + 1,
											value: purchaseAmountsgst
										});
										billObject.setSublistValue({
											sublistId: 'expense',
											fieldId: 'amount',
											line: tempCountExp + 1,
											value: purchaseAmountsgst
										});
										billObject.setSublistValue({
											sublistId: 'expense',
											fieldId: 'taxcode',
											line: tempCountExp + 1,
											value: revTaxCode
										});


										billObject.setSublistValue({
											sublistId: 'expense',
											fieldId: 'custcol_gst_sgstrate',
											line: tempCountExp + 1,
											value: sgstRate
										});
										billObject.setSublistValue({
											sublistId: 'expense',
											fieldId: 'custcol_gst_sgstamount',
											line: tempCountExp + 1,
											value: purchaseAmountsgst
										});
										billObject.setSublistValue({
											sublistId: 'expense',
											fieldId: 'custcol_gst_cgstrate',
											line: tempCountExp + 1,
											value: 0
										});
										billObject.setSublistValue({
											sublistId: 'expense',
											fieldId: 'custcol_gst_cgstamount',
											line: tempCountExp + 1,
											value: 0
										});
										billObject.setSublistValue({
											sublistId: 'expense',
											fieldId: 'custcol_gst_igstrate',
											line: tempCountExp + 1,
											value: 0
										});
										billObject.setSublistValue({
											sublistId: 'expense',
											fieldId: 'custcol_gst_igstamount',
											line: tempCountExp + 1,
											value: 0
										});
										billObject.setSublistValue({
											sublistId: 'expense',
											fieldId: 'custcol_gst_reversal_apply',
											line: tempCountExp + 1,
											value: true
										});
										billObject.setSublistValue({ //Added location...
											sublistId: 'expense',
											fieldId: 'location',
											line: tempCountExp + 1,
											value: getLoc
										});
										billObject.setSublistValue({ //Added Department...
											sublistId: 'expense',
											fieldId: 'department',
											line: tempCountExp + 1,
											value: getDept
										});

										//Set SGST Payable Item and Calculated Negative SGST Rate and Amount.
										billObject.setSublistValue({
											sublistId: 'expense',
											fieldId: 'account',
											line: tempCountExp + 2,
											value: expAcctSGSTPayableAcctID // 2 SGST Payable
										});

										billObject.setSublistValue({
											sublistId: 'expense',
											fieldId: 'rate',
											line: tempCountExp + 2,
											value: negativeAmountsgst
										});
										billObject.setSublistValue({
											sublistId: 'expense',
											fieldId: 'amount',
											line: tempCountExp + 2,
											value: negativeAmountsgst
										});
										billObject.setSublistValue({
											sublistId: 'expense',
											fieldId: 'taxcode',
											line: tempCountExp + 2,
											value: revTaxCode
										});


										billObject.setSublistValue({
											sublistId: 'expense',
											fieldId: 'custcol_gst_sgstrate',
											line: tempCountExp + 2,
											value: sgstRate
										});
										billObject.setSublistValue({
											sublistId: 'expense',
											fieldId: 'custcol_gst_sgstamount',
											line: tempCountExp + 2,
											value: purchaseAmountsgst
										});
										billObject.setSublistValue({
											sublistId: 'expense',
											fieldId: 'custcol_gst_cgstrate',
											line: tempCountExp + 2,
											value: 0
										});
										billObject.setSublistValue({
											sublistId: 'expense',
											fieldId: 'custcol_gst_cgstamount',
											line: tempCountExp + 2,
											value: 0
										});
										billObject.setSublistValue({
											sublistId: 'expense',
											fieldId: 'custcol_gst_igstrate',
											line: tempCountExp + 2,
											value: 0
										});
										billObject.setSublistValue({
											sublistId: 'expense',
											fieldId: 'custcol_gst_igstamount',
											line: tempCountExp + 2,
											value: 0
										});
										billObject.setSublistValue({
											sublistId: 'expense',
											fieldId: 'custcol_gst_reversal_apply',
											line: tempCountExp + 2,
											value: true
										});
										billObject.setSublistValue({ //Added location...
											sublistId: 'expense',
											fieldId: 'location',
											line: tempCountExp + 2,
											value: getLoc
										});
										billObject.setSublistValue({ //Added Department...
											sublistId: 'expense',
											fieldId: 'department',
											line: tempCountExp + 2,
											value: getDept
										});

										//Set CGST Purchase Item and Calculated CGST Rate and Amount.
										billObject.setSublistValue({
											sublistId: 'expense',
											fieldId: 'account',
											line: tempCountExp + 3,
											value: expAcctCGSTPurchaseAcctID //3 CGST Purchase
										});
										billObject.setSublistValue({
											sublistId: 'expense',
											fieldId: 'rate',
											line: tempCountExp + 3,
											value: purchaseAmountcgst
										});
										billObject.setSublistValue({
											sublistId: 'expense',
											fieldId: 'amount',
											line: tempCountExp + 3,
											value: purchaseAmountcgst
										});
										billObject.setSublistValue({
											sublistId: 'expense',
											fieldId: 'taxcode',
											line: tempCountExp + 3,
											value: revTaxCode
										});

										billObject.setSublistValue({
											sublistId: 'expense',
											fieldId: 'custcol_gst_cgstrate',
											line: tempCountExp + 3,
											value: cgstRate
										});
										billObject.setSublistValue({
											sublistId: 'expense',
											fieldId: 'custcol_gst_cgstamount',
											line: tempCountExp + 3,
											value: purchaseAmountcgst
										});
										billObject.setSublistValue({
											sublistId: 'expense',
											fieldId: 'custcol_gst_sgstrate',
											line: tempCountExp + 3,
											value: 0
										});
										billObject.setSublistValue({
											sublistId: 'expense',
											fieldId: 'custcol_gst_sgstamount',
											line: tempCountExp + 3,
											value: 0
										});
										billObject.setSublistValue({
											sublistId: 'expense',
											fieldId: 'custcol_gst_igstrate',
											line: tempCountExp + 3,
											value: 0
										});
										billObject.setSublistValue({
											sublistId: 'expense',
											fieldId: 'custcol_gst_igstamount',
											line: tempCountExp + 3,
											value: 0
										});
										billObject.setSublistValue({
											sublistId: 'expense',
											fieldId: 'custcol_gst_reversal_apply',
											line: tempCountExp + 3,
											value: true
										});
										billObject.setSublistValue({
											sublistId: 'expense',
											fieldId: 'location',
											line: tempCountExp + 3,
											value: getLoc
										});
										billObject.setSublistValue({
											sublistId: 'expense',
											fieldId: 'department',
											line: tempCountExp + 3,
											value: getDept
										});

										//Set CGST Payable Item and Calculated Negative CGST Rate and Amount.
										billObject.setSublistValue({
											sublistId: 'expense',
											fieldId: 'account',
											line: tempCountExp + 4,
											value: expAcctCGSTPayableAcctID //4 CGST payable
										});
										billObject.setSublistValue({
											sublistId: 'expense',
											fieldId: 'rate',
											line: tempCountExp + 4,
											value: negativeAmountcgst
										});
										billObject.setSublistValue({
											sublistId: 'expense',
											fieldId: 'amount',
											line: tempCountExp + 4,
											value: negativeAmountcgst
										});
										billObject.setSublistValue({
											sublistId: 'expense',
											fieldId: 'taxcode',
											line: tempCountExp + 4,
											value: revTaxCode
										});

										billObject.setSublistValue({
											sublistId: 'expense',
											fieldId: 'custcol_gst_cgstrate',
											line: tempCountExp + 4,
											value: cgstRate
										});
										billObject.setSublistValue({
											sublistId: 'expense',
											fieldId: 'custcol_gst_cgstamount',
											line: tempCountExp + 4,
											value: purchaseAmountcgst
										});
										billObject.setSublistValue({
											sublistId: 'expense',
											fieldId: 'custcol_gst_sgstrate',
											line: tempCountExp + 4,
											value: 0
										});
										billObject.setSublistValue({
											sublistId: 'expense',
											fieldId: 'custcol_gst_sgstamount',
											line: tempCountExp + 4,
											value: 0
										});
										billObject.setSublistValue({
											sublistId: 'expense',
											fieldId: 'custcol_gst_igstrate',
											line: tempCountExp + 4,
											value: 0
										});
										billObject.setSublistValue({
											sublistId: 'expense',
											fieldId: 'custcol_gst_igstamount',
											line: tempCountExp + 4,
											value: 0
										});
										billObject.setSublistValue({
											sublistId: 'expense',
											fieldId: 'custcol_gst_reversal_apply',
											line: tempCountExp + 4,
											value: true
										});
										billObject.setSublistValue({ //Added location...
											sublistId: 'expense',
											fieldId: 'location',
											line: tempCountExp + 4,
											value: getLoc
										});
										billObject.setSublistValue({ //Added Department...
											sublistId: 'expense',
											fieldId: 'department',
											line: tempCountExp + 4,
											value: getDept
										});

										tempCountExp = tempCountExp + 4;

									}
								}

								//Else set the tax-code id received as is to the tax code field.
								else if (isReversal == false && isReversalLine == false) {

									if (isIGST == 'T' || isIGST == "T") {
										//Set the IGST rate and calculated amount for the item selected.

										billObject.setSublistValue({
											sublistId: 'expense',
											fieldId: 'taxcode',
											line: p,
											value: taxCodeId
										});

										/*  billObject.setSublistValue({
										      sublistId: 'expense',
										      fieldId: 'account',
										      line: p,
										      value:
										  });*/

										billObject.setSublistValue({
											sublistId: 'expense',
											fieldId: 'custcol_gst_igstrate',
											line: p,
											value: igstRate
										});
										billObject.setSublistValue({
											sublistId: 'expense',
											fieldId: 'custcol_gst_igstamount',
											line: p,
											value: purchaseAmountigst
										});
										billObject.setSublistValue({
											sublistId: 'expense',
											fieldId: 'custcol_gst_cgstrate',
											line: p,
											value: 0
										});
										billObject.setSublistValue({
											sublistId: 'expense',
											fieldId: 'custcol_gst_cgstamount',
											line: p,
											value: 0
										});
										billObject.setSublistValue({
											sublistId: 'expense',
											fieldId: 'custcol_gst_sgstrate',
											line: p,
											value: 0
										});
										billObject.setSublistValue({
											sublistId: 'expense',
											fieldId: 'custcol_gst_sgstamount',
											line: p,
											value: 0
										});

									} else if (isIGST == 'F' || isIGST == "F") {

										//Set the cgst and sgst rate and amount for the item selected.
										billObject.setSublistValue({
											sublistId: 'expense',
											fieldId: 'taxcode',
											line: p,
											value: taxCodeId
										});

										/*  billObject.setSublistValue({
										      sublistId: 'expense',
										      fieldId: 'account',
										      line: p,
										      value:
										  });*/


										billObject.setSublistValue({
											sublistId: 'expense',
											fieldId: 'custcol_gst_cgstrate',
											line: p,
											value: cgstRate
										});
										billObject.setSublistValue({
											sublistId: 'expense',
											fieldId: 'custcol_gst_cgstamount',
											line: p,
											value: purchaseAmountcgst
										});
										billObject.setSublistValue({
											sublistId: 'expense',
											fieldId: 'custcol_gst_sgstrate',
											line: p,
											value: sgstRate
										});
										billObject.setSublistValue({
											sublistId: 'expense',
											fieldId: 'custcol_gst_sgstamount',
											line: p,
											value: purchaseAmountsgst
										});
										billObject.setSublistValue({
											sublistId: 'expense',
											fieldId: 'custcol_gst_igstrate',
											line: p,
											value: 0
										});
										billObject.setSublistValue({
											sublistId: 'expense',
											fieldId: 'custcol_gst_igstamount',
											line: p,
											value: 0
										});

									}
								}
							}
						}
						//Set Total CGST, SGST and IGST in body fields on GST tab.
						if (isIGST == 'F' || isIGST == "F") {

							billObject.setValue({
								fieldId: 'custbody_gst_totalcgst',
								value: totalCgstAmount
							});
							billObject.setValue({
								fieldId: 'custbody_gst_totalsgst',
								value: totalSgstAmount
							});
							billObject.setValue({
								fieldId: 'custbody_gst_totaligst',
								value: 0
							});

						} else if (isIGST == 'T' || isIGST == "T") {

							billObject.setValue({
								fieldId: 'custbody_gst_totaligst',
								value: totalIgstAmount
							});
							billObject.setValue({
								fieldId: 'custbody_gst_totalcgst',
								value: 0
							});
							billObject.setValue({
								fieldId: 'custbody_gst_totalsgst',
								value: 0
							});
						}

						/*var result1 = billObject.save();
						log.debug('Before saved Record id', result1);*/

						var recordId = billObject.save({
							enableSourcing: true,
							ignoreMandatoryFields: true
						});

						log.debug('Before saved Record id', recordId);
					}
				} catch (exp) {
					log.debug('Exception Log in before submit:-', exp.id);
					log.debug('Exception Log in before submit:-', exp.message);
				}
			}
		}


		/**
		 * Function definition to be triggered before record is loaded.
		 *
		 * @param {Object} scriptContext
		 * @param {Record} scriptContext.newRecord - New record
		 * @param {Record} scriptContext.oldRecord - Old record
		 * @param {string} scriptContext.type - Trigger type
		 * @Since 2015.2
		 */
		function afterSubmit(scriptContext) {

			var taxCodeId, getTaxCode, revSGSTPurchaseItem, revSGSTPayableItem, revCGSTPurchaseItem, revCGSTPayableItem, revIGSTPurchaseItem, revIGSTPayableItem;
			var revTaxCode = '';

			try {

				var totalCgstAmount = Number(0);
				var totalSgstAmount = Number(0);
				var totalIgstAmount = Number(0);

				if (scriptContext.type == scriptContext.UserEventType.EDIT) {

					log.debug('Edit time................. ');

					var recordId = scriptContext.newRecord.id;

					var billObject = record.load({
						type: scriptContext.newRecord.type,
						id: recordId,
						isDynamic: true
					});

					var gstType = billObject.getValue({
						fieldId: 'custbody_gst_gsttype'
					});

					//Line count of Expense
					var lineExpenseCount = billObject.getLineCount({
						sublistId: 'expense'
					});
					log.debug('lineExpense Count after sub:-', lineExpenseCount);

					//Line count of Item
					var lineItemCount = billObject.getLineCount({
						sublistId: 'item'
					});
					log.debug('lineItemCount after sub:-', lineItemCount);


					var countlineOfItem = Number(0);
					var countlineOfExp = Number(0);

					//  if (lineItemCount != '' || lineItemCount != null || lineItemCount!= 0) {
					if (lineItemCount > 0) {
						log.debug('Remove Line Item...');

						for (var l = lineItemCount - 1; l >= 0; l--) {

							var isReversalLine = billObject.getSublistValue({
								sublistId: 'item',
								fieldId: 'custcol_gst_reversal_apply',
								line: l
							});
							log.debug('isReversalLine in Item on edit mode:-', isReversalLine);

							if (isReversalLine) {
								billObject.removeLine({
									sublistId: 'item',
									line: l
								});
							} else {
								countlineOfItem++;
							}
						}

						tempCountItem = countlineOfItem;
						log.debug('Item Count add items in item(countlineOfItem) :-', countlineOfItem);

					}
					if (lineExpenseCount > 0) {
						log.debug('Remove Line Expense...');

						for (var k = lineExpenseCount - 1; k >= 0; k--) {

							var isReversalLine = billObject.getSublistValue({
								sublistId: 'expense',
								fieldId: 'custcol_gst_reversal_apply',
								line: k
							});
							log.debug('isReversalLine in Expense on edit mode:-', isReversalLine);

							if (isReversalLine) {
								billObject.removeLine({
									sublistId: 'expense',
									line: k
								});
							} else {
								countlineOfExp++;
							}
						}

						tempCountExp = countlineOfExp;
						log.debug('Exp Count add items in expense (countlineOfExp):-', countlineOfExp);

					}

					//Loop of items to process for calculating the tax amount

					log.debug('Item Count add items in item :-', countlineOfItem);
					log.debug('Exp Count add items in expense:-', countlineOfExp);

					//this function is used to get the discount items/Account

					var mainDiscountItemIds = discountItemsAcct();

					discountItemIds = mainDiscountItemIds[0].discountItemIds;
					log.debug('discount Item Ids in edit/after submit:- : ', JSON.stringify(mainDiscountItemIds));

					for (var e = 0; e < countlineOfItem; e++) {

						var getItem = billObject.getSublistValue({
							sublistId: 'item',
							fieldId: 'item',
							line: e
						});
						log.debug('getItem edit condition:- ', getItem);


						if (discountItemIds.indexOf(getItem) == -1) {

							//Get Reversal check-box value to accordingly calculate the tax amount.
							var isReversal = billObject.getSublistValue({
								sublistId: 'item',
								fieldId: 'custcol_gst_reversal_line',
								line: e
							});
							log.debug('isReversal edit condition:-', isReversal);

							var isReversalLine = billObject.getSublistValue({
								sublistId: 'item',
								fieldId: 'custcol_gst_reversal_apply',
								line: e
							});
							log.debug('isReversalLine edit condition:-', isReversalLine);

							var reversalProcess = billObject.getSublistValue({
								sublistId: 'item',
								fieldId: 'custcol_gst_reversal_process',
								line: e
							});
							log.debug('reversalProcess edit condition:-', reversalProcess);

							var getAmount = billObject.getSublistValue({
								sublistId: 'item',
								fieldId: 'amount',
								line: e
							});
							log.debug('getAmount ', getAmount);

							var getTaxCode = billObject.getSublistValue({
								sublistId: 'item',
								fieldId: 'taxcode',
								line: e
							});

							//Added on ATN instance
							var getLoc = billObject.getSublistValue({
								sublistId: 'item',
								fieldId: 'location',
								line: e
							});

							var getDept = billObject.getSublistValue({
								sublistId: 'item',
								fieldId: 'department',
								line: e
							});
							//Ended on ATN instance

							//Lookup on item to get the item's schedule id.
							//if (getItem) {
							var lookupScheduleId = search.lookupFields({
								type: 'item',
								id: getItem,
								columns: 'custitem_gst_itemschedule'
							});
							log.debug("lookupScheduleId edit condition: ", lookupScheduleId);

							if (lookupScheduleId.custitem_gst_itemschedule[0]) {
								var scheduleId = lookupScheduleId.custitem_gst_itemschedule[0].value;
							}

							if ((gstType != '' && gstType != null) && (scheduleId != '' && scheduleId != null)) {

								//Search on GST Tax Code Matrix to get the tax code, reversal tax code, reversal purchase and payable items for cgst, sgst and igst.
								var filterTaxCodeMatrix = new Array();

								filterTaxCodeMatrix.push(search.createFilter({
									name: 'isinactive',
									operator: search.Operator.IS,
									values: false
								}));

								filterTaxCodeMatrix.push(search.createFilter({
									name: 'custrecord_gst_type',
									operator: search.Operator.IS,
									values: gstType
								}));

								filterTaxCodeMatrix.push(search.createFilter({
									name: 'custrecord_gst_item_schedule',
									operator: search.Operator.IS,
									values: scheduleId
								}));

									var columnTaxCodeMatrix = [];

									columnTaxCodeMatrix.push(search.createColumn({
										name: 'custrecord_gst_tax_code'
									}));

									columnTaxCodeMatrix.push(search.createColumn({
										name: 'custrecord_sgst_revpur_item'
									}));

									columnTaxCodeMatrix.push(search.createColumn({
										name: 'custrecord_sgst_revpay_item'
									}));

									columnTaxCodeMatrix.push(search.createColumn({
										name: 'custrecord_cgst_revpur_item'
									}));

									columnTaxCodeMatrix.push(search.createColumn({
										name: 'custrecord_cgst_revpay_item'
									}));

									columnTaxCodeMatrix.push(search.createColumn({
										name: 'custrecord_igst_revpur_item'
									}));

									columnTaxCodeMatrix.push(search.createColumn({
										name: 'custrecord_igst_revpay_item'
									}));

									columnTaxCodeMatrix.push(search.createColumn({
										name: 'custrecord_gst_reversal_taxcode'
									}));

									var searchTaxCodeMatrix = search.create({
										"type": "customrecord_gst_tax_code_matrix",
										"filters": filterTaxCodeMatrix,
										"columns": columnTaxCodeMatrix
									});

									var arraySearchTaxCodeMatrix = searchTaxCodeMatrix.run().getRange({
										start: 0,
										end: 1
									});

									//If search record found. Get the values of tax code, reversal tax code, and all the reversal items of cgst, sgst and igst.
									if (arraySearchTaxCodeMatrix[0] != '' && arraySearchTaxCodeMatrix[0] != null && arraySearchTaxCodeMatrix[0] != undefined && arraySearchTaxCodeMatrix[0] != 'null' && arraySearchTaxCodeMatrix[0] != 'undefined') {

										taxCodeId = arraySearchTaxCodeMatrix[0].getValue('custrecord_gst_tax_code');
										revSGSTPurchaseItem = arraySearchTaxCodeMatrix[0].getValue('custrecord_sgst_revpur_item');
										revSGSTPayableItem = arraySearchTaxCodeMatrix[0].getValue('custrecord_sgst_revpay_item');
										revCGSTPurchaseItem = arraySearchTaxCodeMatrix[0].getValue('custrecord_cgst_revpur_item');
										revCGSTPayableItem = arraySearchTaxCodeMatrix[0].getValue('custrecord_cgst_revpay_item');
										revIGSTPurchaseItem = arraySearchTaxCodeMatrix[0].getValue('custrecord_igst_revpur_item');
										revIGSTPayableItem = arraySearchTaxCodeMatrix[0].getValue('custrecord_igst_revpay_item');
										revTaxCode = arraySearchTaxCodeMatrix[0].getValue('custrecord_gst_reversal_taxcode');

										log.debug("Inside if search record found.", 'taxCodeId ' + taxCodeId + ' revSGSTPurchaseItem ' + revSGSTPurchaseItem + ' revSGSTPayableItem ' + revSGSTPayableItem);
										log.debug("Inside if search record found.", 'revCGSTPurchaseItem ' + revCGSTPurchaseItem + ' revCGSTPayableItem ' + revCGSTPayableItem);
										log.debug("Inside if search record found.", 'revIGSTPurchaseItem ' + revIGSTPurchaseItem + ' revIGSTPayableItem ' + revIGSTPayableItem + ' revTaxCode ' + revTaxCode);

									}
							}

							//Variables declared to store the rates respectively.
							var cgstRate, sgstRate, igstRate;

							//Variable declared to flag gst type as inter or intra. this is done to avoid hard-code of inter and intra id's.
							var isIGST = 'F';

							//Load Tax-group to get the "cgst and sgst" or "igst" rates for reversal calculation.
							var loadTaxGroup = record.load({
								type: record.Type.TAX_GROUP,
								id: taxCodeId
							});
							log.debug("loadTaxGroup:- ", loadTaxGroup);
							var taxLineItems = loadTaxGroup.getLineCount({
								sublistId: 'taxitem'
							});
							log.debug("taxLineItems:- ", taxLineItems);

							for (var t1 = 0; t1 < taxLineItems; t1++) {

								//Get the tax name and split to compare the gst type and get the rate accordingly.
								var taxname = loadTaxGroup.getSublistValue({
									sublistId: 'taxitem',
									fieldId: 'taxname2',
									line: t1
								});
								log.debug("taxname:- ", taxname);

								taxname = taxname.split("_");
								taxname = taxname.toLocaleString().toLowerCase().split(',');

								if (taxname.indexOf(cgst) >= 0) {

									cgstRate = loadTaxGroup.getSublistValue({
										sublistId: 'taxitem',
										fieldId: 'rate',
										line: t1
									});
									log.debug('cgstRate', cgstRate);

								}

								if (taxname.indexOf(sgst) >= 0) {

									sgstRate = loadTaxGroup.getSublistValue({
										sublistId: 'taxitem',
										fieldId: 'rate',
										line: t1
									});
									log.debug('sgstRate', sgstRate);

								}

								if (taxname.indexOf(igst) >= 0) {

									isIGST = 'T';
									igstRate = loadTaxGroup.getSublistValue({
										sublistId: 'taxitem',
										fieldId: 'rate',
										line: t1
									});
									log.debug('igstRate', igstRate);

								}

							}

							log.debug('isIGST', isIGST);

							//Calculate CGST, SGST and IGST amount to be set on the line.
							//Total is calculated of all the lines to be set on total CGST, SGST and IGST fields for print.
							if (isIGST == 'T' || isIGST == "T") {

								var purchaseAmountigst = getAmount * (igstRate / 100);
								var negativeAmountigst = -purchaseAmountigst;

								var totalIgstAmount = Number(totalIgstAmount) + Number(purchaseAmountigst);
								log.debug("totalIgstAmount:- ", totalIgstAmount);

							} else if (isIGST == 'F' || isIGST == "F") {

								var purchaseAmountcgst = getAmount * (cgstRate / 100);
								var negativeAmountcgst = -purchaseAmountcgst;

								var purchaseAmountsgst = getAmount * (sgstRate / 100);
								var negativeAmountsgst = -purchaseAmountsgst;

								totalCgstAmount = Number(totalCgstAmount) + Number(purchaseAmountcgst);
								totalSgstAmount = Number(totalSgstAmount) + Number(purchaseAmountsgst);
							}

							// add line items at the time of edit on line level...
							//If reversal check-box is checked the reversal calculations to be done.


							if (isReversal == true && reversalProcess == true) {

								log.debug("reversal checkbox is true and process is true");
								billObject.selectLine({
									sublistId: 'item',
									line: e
								});

								log.debug("set line value:- ", e);

								billObject.setCurrentSublistValue({
									sublistId: 'item',
									fieldId: 'taxcode',
									value: revTaxCode
								});

								billObject.commitLine({
									sublistId: 'item'
								});

								//If isIGST is true - GST type is considered as Inter.
								if (isIGST == 'T' || isIGST == "T") {

									log.debug('tempCountItem', tempCountItem);
									log.debug('tempCountItem+1', tempCountItem + 1);
									log.debug('revIGSTPurchaseItem set:- ', revIGSTPurchaseItem);

									billObject.selectNewLine({
										sublistId: 'item'
									});

									//Set IGST Purchase Item and Calculated IGST Rate and Amount.
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'item',
										value: revIGSTPurchaseItem
									});
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'rate',
										value: purchaseAmountigst
									});
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'amount',
										value: purchaseAmountigst
									});
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'taxcode',
										value: revTaxCode
									});
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'custcol_gst_reversal_apply',
										value: true
									});
									billObject.setCurrentSublistValue({ //Added location...
										sublistId: 'item',
										fieldId: 'location',
										value: getLoc
									});
									billObject.setCurrentSublistValue({ //Added Department...
										sublistId: 'item',
										fieldId: 'department',
										value: getDept
									});


									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'custcol_gst_igstrate',
										value: igstRate
									});
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'custcol_gst_igstamount',
										value: purchaseAmountigst
									});
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'custcol_gst_cgstrate',
										value: 0
									});
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'custcol_gst_cgstamount',
										value: 0
									});
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'custcol_gst_sgstrate',
										value: 0
									});
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'custcol_gst_sgstamount',
										value: 0
									});

									billObject.commitLine({
										sublistId: 'item'
									});

									//Set IGST Payable Item and Calculated Negative IGST Rate and Amount on the second line by selecting the item.
									billObject.selectNewLine({
										sublistId: 'item'
									});

									log.debug('revIGSTPayableItem set:- ', revIGSTPayableItem);

									//Set IGST Payable Item and Calculated Negative IGST Rate and Amount.
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'item',
										value: revIGSTPayableItem
									});
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'rate',
										value: negativeAmountigst
									});
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'amount',
										value: negativeAmountigst
									});
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'taxcode',
										value: revTaxCode
									});
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'custcol_gst_reversal_apply',
										value: true
									});

									billObject.setCurrentSublistValue({ //Added location...
										sublistId: 'item',
										fieldId: 'location',
										value: getLoc
									});
									billObject.setCurrentSublistValue({ //Added Department...
										sublistId: 'item',
										fieldId: 'department',
										value: getDept
									});

									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'custcol_gst_igstrate',
										value: igstRate
									});
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'custcol_gst_igstamount',
										value: purchaseAmountigst
									});
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'custcol_gst_cgstrate',
										value: 0
									});
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'custcol_gst_cgstamount',
										value: 0
									});
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'custcol_gst_sgstrate',
										value: 0
									});
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'custcol_gst_sgstamount',
										value: 0
									});

									tempCountItem = tempCountItem + 2;

									billObject.commitLine({
										sublistId: 'item'
									});

								}
								//If isIGST is false - GST Type is considered as Intra.
								else if (isIGST == 'F' || isIGST == "F") {

									billObject.selectNewLine({
										sublistId: 'item'
									});

									//Set SGST Purchase Item and Calculated SGST Rate and Amount.
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'item',
										value: revSGSTPurchaseItem
									});
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'rate',
										value: purchaseAmountsgst
									});
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'amount',
										value: purchaseAmountsgst
									});
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'taxcode',
										value: revTaxCode
									});
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'custcol_gst_sgstrate',
										value: sgstRate
									});
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'custcol_gst_sgstamount',
										value: purchaseAmountsgst
									});
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'custcol_gst_cgstrate',
										value: 0
									});
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'custcol_gst_cgstamount',
										value: 0
									});
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'custcol_gst_igstrate',
										value: 0
									});
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'custcol_gst_igstamount',
										value: 0
									});
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'custcol_gst_reversal_apply',
										value: true
									});
									billObject.setCurrentSublistValue({ //Added location...
										sublistId: 'item',
										fieldId: 'location',
										value: getLoc
									});
									billObject.setCurrentSublistValue({ //Added Department...
										sublistId: 'item',
										fieldId: 'department',
										value: getDept
									});

									billObject.commitLine({
										sublistId: 'item'
									});

									//if condition is F then set on second line...
									billObject.selectNewLine({
										sublistId: 'item'
									});

									//Set SGST Payable Item and Calculated Negative SGST Rate and Amount.
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'item',
										value: revSGSTPayableItem
									});
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'rate',
										value: negativeAmountsgst
									});
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'amount',
										value: negativeAmountsgst
									});
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'taxcode',
										value: revTaxCode
									});
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'custcol_gst_sgstrate',
										value: sgstRate
									});
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'custcol_gst_sgstamount',
										value: purchaseAmountsgst
									});
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'custcol_gst_cgstrate',
										value: 0
									});
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'custcol_gst_cgstamount',
										value: 0
									});
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'custcol_gst_igstrate',
										value: 0
									});
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'custcol_gst_igstamount',
										value: 0
									});
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'custcol_gst_reversal_apply',
										value: true
									});
									billObject.setCurrentSublistValue({ //Added location...
										sublistId: 'item',
										fieldId: 'location',
										value: getLoc
									});
									billObject.setCurrentSublistValue({ //Added Department...
										sublistId: 'item',
										fieldId: 'department',
										value: getDept
									});
									billObject.commitLine({
										sublistId: 'item'
									});

									//On 3rd line of CGST calculations....
									billObject.selectNewLine({
										sublistId: 'item'
									});


									//Set CGST Purchase Item and Calculated CGST Rate and Amount.
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'item',
										value: revCGSTPurchaseItem
									});
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'rate',
										value: purchaseAmountcgst
									});
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'amount',
										value: purchaseAmountcgst
									});
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'taxcode',
										value: revTaxCode
									});
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'custcol_gst_cgstrate',
										value: cgstRate
									});
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'custcol_gst_cgstamount',
										value: purchaseAmountcgst
									});
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'custcol_gst_sgstrate',
										value: 0
									});
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'custcol_gst_sgstamount',
										value: 0
									});
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'custcol_gst_igstrate',
										value: 0
									});
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'custcol_gst_igstamount',
										value: 0
									});
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'custcol_gst_reversal_apply',
										value: true
									});
									billObject.setCurrentSublistValue({ //Added location...
										sublistId: 'item',
										fieldId: 'location',
										value: getLoc
									});
									billObject.setCurrentSublistValue({ //Added Department...
										sublistId: 'item',
										fieldId: 'department',
										value: getDept
									});
									billObject.commitLine({
										sublistId: 'item'
									});

									//4th line CGST item...
									billObject.selectNewLine({
										sublistId: 'item'
									});


									//Set CGST Payable Item and Calculated Negative CGST Rate and Amount.
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'item',
										value: revCGSTPayableItem
									});
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'rate',
										value: negativeAmountcgst
									});
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'amount',
										value: negativeAmountcgst
									});
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'taxcode',
										value: revTaxCode
									});
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'custcol_gst_cgstrate',
										value: cgstRate
									});
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'custcol_gst_cgstamount',
										value: purchaseAmountcgst
									});
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'custcol_gst_sgstrate',
										value: 0
									});
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'custcol_gst_sgstamount',
										value: 0
									});
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'custcol_gst_igstrate',
										value: 0
									});
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'custcol_gst_igstamount',
										value: 0
									});
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'custcol_gst_reversal_apply',
										value: true
									});
									billObject.setCurrentSublistValue({ //Added location...
										sublistId: 'item',
										fieldId: 'location',
										value: getLoc
									});
									billObject.setCurrentSublistValue({ //Added Department...
										sublistId: 'item',
										fieldId: 'department',
										value: getDept
									});

									tempCountItem = tempCountItem + 4;
									billObject.commitLine({
										sublistId: 'item'
									});


								}
							}

							//record saved normal way after edit the record then check reversal apply then it set the discount items...
							else if (isReversal == true && reversalProcess == false) {

								log.debug("reversal checkbox is true and process is false");
								billObject.selectLine({
									sublistId: 'item',
									line: e
								});
								log.debug("set line value:- ", e);

								billObject.setCurrentSublistValue({
									sublistId: 'item',
									fieldId: 'taxcode',
									value: revTaxCode
								});

								billObject.setCurrentSublistValue({
									sublistId: 'item',
									fieldId: 'custcol_gst_reversal_process',
									value: true
								});

								billObject.commitLine({
									sublistId: 'item'
								});

								//If isIGST is true - GST type is considered as Inter.
								if (isIGST == 'T' || isIGST == "T") {

									log.debug('tempCountItem', tempCountItem);
									log.debug('tempCountItem+1', tempCountItem + 1);
									log.debug('revIGSTPurchaseItem set:- ', revIGSTPurchaseItem);

									billObject.selectNewLine({
										sublistId: 'item'
									});

									//Set IGST Purchase Item and Calculated IGST Rate and Amount.
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'item',
										value: revIGSTPurchaseItem
									});
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'rate',
										value: purchaseAmountigst
									});
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'amount',
										//  line: tempCountItem + 1,
										value: purchaseAmountigst
									});
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'taxcode',
										value: revTaxCode
									});
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'custcol_gst_reversal_apply',
										value: true
									});
									billObject.setCurrentSublistValue({ //Added location...
										sublistId: 'item',
										fieldId: 'location',
										value: getLoc
									});
									billObject.setCurrentSublistValue({ //Added Department...
										sublistId: 'item',
										fieldId: 'department',
										value: getDept
									});


									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'custcol_gst_igstrate',
										value: igstRate
									});
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'custcol_gst_igstamount',
										value: purchaseAmountigst
									});
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'custcol_gst_cgstrate',
										value: 0
									});
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'custcol_gst_cgstamount',
										value: 0
									});
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'custcol_gst_sgstrate',
										value: 0
									});
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'custcol_gst_sgstamount',
										value: 0
									});

									billObject.commitLine({
										sublistId: 'item'
									});

									//Set IGST Payable Item and Calculated Negative IGST Rate and Amount on the second line by selecting the item.
									billObject.selectNewLine({
										sublistId: 'item'
									});

									log.debug('revIGSTPayableItem set:- ', revIGSTPayableItem);
									//Set IGST Payable Item and Calculated Negative IGST Rate and Amount.
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'item',
										value: revIGSTPayableItem
									});
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'rate',
										value: negativeAmountigst
									});
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'amount',
										value: negativeAmountigst
									});
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'taxcode',
										value: revTaxCode
									});
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'custcol_gst_reversal_apply',
										value: true
									});

									billObject.setCurrentSublistValue({ //Added location...
										sublistId: 'item',
										fieldId: 'location',
										value: getLoc
									});
									billObject.setCurrentSublistValue({ //Added Department...
										sublistId: 'item',
										fieldId: 'department',
										value: getDept
									});

									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'custcol_gst_igstrate',
										value: igstRate
									});
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'custcol_gst_igstamount',
										value: purchaseAmountigst
									});
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'custcol_gst_cgstrate',
										value: 0
									});
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'custcol_gst_cgstamount',
										value: 0
									});
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'custcol_gst_sgstrate',
										value: 0
									});
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'custcol_gst_sgstamount',
										value: 0
									});

									tempCountItem = tempCountItem + 2;
									billObject.commitLine({
										sublistId: 'item'
									});

								}
								//If isIGST is false - GST Type is considered as Intra.
								else if (isIGST == 'F' || isIGST == "F") {

									billObject.selectNewLine({
										sublistId: 'item'
									});

									//Set SGST Purchase Item and Calculated SGST Rate and Amount.
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'item',
										value: revSGSTPurchaseItem
									});
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'rate',
										value: purchaseAmountsgst
									});
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'amount',
										value: purchaseAmountsgst
									});
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'taxcode',
										value: revTaxCode
									});
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'custcol_gst_sgstrate',
										value: sgstRate
									});
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'custcol_gst_sgstamount',
										value: purchaseAmountsgst
									});
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'custcol_gst_cgstrate',
										value: 0
									});
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'custcol_gst_cgstamount',
										value: 0
									});
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'custcol_gst_igstrate',
										value: 0
									});
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'custcol_gst_igstamount',
										value: 0
									});
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'custcol_gst_reversal_apply',
										value: true
									});
									billObject.setCurrentSublistValue({ //Added location...
										sublistId: 'item',
										fieldId: 'location',
										value: getLoc
									});
									billObject.setCurrentSublistValue({ //Added Department...
										sublistId: 'item',
										fieldId: 'department',
										value: getDept
									});

									billObject.commitLine({
										sublistId: 'item'
									});

									//if condition is F then set on second line...
									billObject.selectNewLine({
										sublistId: 'item'
									});

									//Set SGST Payable Item and Calculated Negative SGST Rate and Amount.
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'item',
										value: revSGSTPayableItem
									});
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'rate',
										value: negativeAmountsgst
									});
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'amount',
										value: negativeAmountsgst
									});
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'taxcode',
										value: revTaxCode
									});
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'custcol_gst_sgstrate',
										value: sgstRate
									});
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'custcol_gst_sgstamount',
										value: purchaseAmountsgst
									});
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'custcol_gst_cgstrate',
										value: 0
									});
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'custcol_gst_cgstamount',
										value: 0
									});
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'custcol_gst_igstrate',
										value: 0
									});
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'custcol_gst_igstamount',
										value: 0
									});
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'custcol_gst_reversal_apply',
										value: true
									});
									billObject.setCurrentSublistValue({ //Added location...
										sublistId: 'item',
										fieldId: 'location',
										value: getLoc
									});
									billObject.setCurrentSublistValue({ //Added Department...
										sublistId: 'item',
										fieldId: 'department',
										value: getDept
									});
									billObject.commitLine({
										sublistId: 'item'
									});

									//On 3rd line  of CGST calculations....
									billObject.selectNewLine({
										sublistId: 'item'
									});


									//Set CGST Purchase Item and Calculated CGST Rate and Amount.
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'item',
										value: revCGSTPurchaseItem
									});
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'rate',
										value: purchaseAmountcgst
									});
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'amount',
										value: purchaseAmountcgst
									});
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'taxcode',
										value: revTaxCode
									});
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'custcol_gst_cgstrate',
										value: cgstRate
									});
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'custcol_gst_cgstamount',
										value: purchaseAmountcgst
									});
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'custcol_gst_sgstrate',
										value: 0
									});
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'custcol_gst_sgstamount',
										value: 0
									});
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'custcol_gst_igstrate',
										value: 0
									});
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'custcol_gst_igstamount',
										value: 0
									});
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'custcol_gst_reversal_apply',
										value: true
									});
									billObject.setCurrentSublistValue({ //Added location...
										sublistId: 'item',
										fieldId: 'location',
										value: getLoc
									});
									billObject.setCurrentSublistValue({ //Added Department...
										sublistId: 'item',
										fieldId: 'department',
										//line: tempCountItem + 3,
										value: getDept
									});
									billObject.commitLine({
										sublistId: 'item'
									});

									//4th line CGST item...
									billObject.selectNewLine({
										sublistId: 'item'
									});


									//Set CGST Payable Item and Calculated Negative CGST Rate and Amount.
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'item',
										value: revCGSTPayableItem
									});
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'rate',
										value: negativeAmountcgst
									});
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'amount',
										value: negativeAmountcgst
									});
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'taxcode',
										value: revTaxCode
									});
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'custcol_gst_cgstrate',
										value: cgstRate
									});
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'custcol_gst_cgstamount',
										value: purchaseAmountcgst
									});
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'custcol_gst_sgstrate',
										value: 0
									});
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'custcol_gst_sgstamount',
										value: 0
									});
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'custcol_gst_igstrate',
										value: 0
									});
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'custcol_gst_igstamount',
										value: 0
									});
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'custcol_gst_reversal_apply',
										value: true
									});
									billObject.setCurrentSublistValue({ //Added location...
										sublistId: 'item',
										fieldId: 'location',
										value: getLoc
									});
									billObject.setCurrentSublistValue({ //Added Department...
										sublistId: 'item',
										fieldId: 'department',
										value: getDept
									});

									tempCountItem = tempCountItem + 4;
									billObject.commitLine({
										sublistId: 'item'
									});
								}
							}
							//Else set the tax-code id received as is to the tax code field.
							else if (isReversal == false && isReversalLine == false) {

								if (isIGST == 'T' || isIGST == "T") {
									log.debug("taxCodeId else:- ", taxCodeId);

									billObject.selectLine({
										sublistId: 'item',
										line: e
									});

									//Set the IGST rate and calculated amount for the item selected.

									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'taxcode',
										value: taxCodeId
									});
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'custcol_gst_igstrate',
										value: igstRate
									});
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'custcol_gst_igstamount',
										value: purchaseAmountigst
									});
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'custcol_gst_cgstrate',
										value: 0
									});
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'custcol_gst_cgstamount',
										value: 0
									});
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'custcol_gst_sgstrate',
										value: 0
									});
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'custcol_gst_sgstamount',
										value: 0
									});

									billObject.commitLine({
										sublistId: 'item'
									});

								} else if (isIGST == 'F' || isIGST == "F") {

									billObject.selectLine({
										sublistId: 'item',
										line: e
									});

									//Set the cgst and sgst rate and amount for the item selected.
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'taxcode',
										value: taxCodeId
									});
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'custcol_gst_cgstrate',
										value: cgstRate
									});
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'custcol_gst_cgstamount',
										value: purchaseAmountcgst
									});
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'custcol_gst_sgstrate',
										value: sgstRate
									});
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'custcol_gst_sgstamount',
										value: purchaseAmountsgst
									});
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'custcol_gst_igstrate',
										value: 0
									});
									billObject.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'custcol_gst_igstamount',
										value: 0
									});

									billObject.commitLine({
										sublistId: 'item'
									});

								}

							}
						} //added for edit of discount items.
					}

					//Loop of expenses to process for calculating the tax amount,rates etc

					//get igst,cgst,sgst rates and amount from the Expense line level...
					var mainDiscountAcctIds = discountItemsAcct();

					discountAcctIds = mainDiscountAcctIds[0].discountAcctIds;
					log.debug('discount Acct Ids in edit/after submit:- : ', JSON.stringify(mainDiscountAcctIds));

					for (var p = 0; p < countlineOfExp; p++) {

						var expCategory = billObject.getSublistValue({
							sublistId: 'expense',
							fieldId: 'category',
							line: p
						});
						log.debug('expense category - ', expCategory);

						var accountId = billObject.getSublistValue({
							sublistId: 'expense',
							fieldId: 'account',
							line: p
						});
						log.debug(' exp accountId - ', accountId);

						if (discountAcctIds.indexOf(accountId) == -1) {

							//Get Reversal check-box value to accordingly calculate the tax amount.
							var isReversal = billObject.getSublistValue({
								sublistId: 'expense',
								fieldId: 'custcol_gst_reversal_line',
								line: p
							});
							log.debug('isReversal edit condition  :-', isReversal);

							var isReversalLine = billObject.getSublistValue({
								sublistId: 'expense',
								fieldId: 'custcol_gst_reversal_apply',
								line: p
							});
							log.debug('isReversalLine edit condition on exp:-', isReversalLine);

							var reversalProcess = billObject.getSublistValue({
								sublistId: 'expense',
								fieldId: 'custcol_gst_reversal_process',
								line: p
							});
							log.debug('reversalProcess edit condition on exp:-', reversalProcess);

							var getLoc = billObject.getSublistValue({
								sublistId: 'expense',
								fieldId: 'location',
								line: p
							});
							log.debug(' exp getLoc - ', getLoc);

							var getDept = billObject.getSublistValue({
								sublistId: 'expense',
								fieldId: 'department',
								line: p
							});

							log.debug(' exp getDept - ', getDept);

							// if (discountAcctIds.indexOf(accountId) == -1) {


							var getAmount = billObject.getSublistValue({
								sublistId: 'expense',
								fieldId: 'amount',
								line: p
							});
							log.debug('exp amount - ', getAmount);

							var getTaxCode = billObject.getSublistValue({
								sublistId: 'expense',
								fieldId: 'taxcode',
								line: p
							});
							log.debug('exp TaxCode - ', getTaxCode);

							//Lookup on item to get the Expense Category's schedule id.
							if (expCategory != null && expCategory != '') {
								var lookupScheduleId = search.lookupFields({
									type: 'expensecategory',
									id: expCategory,
									columns: 'custrecord_gst_expenseschedule'
								});
								log.debug('exp category scheduleId - ', lookupScheduleId);

								if (lookupScheduleId.custrecord_gst_expenseschedule[0]) {
									var scheduleId = lookupScheduleId.custrecord_gst_expenseschedule[0].value;
								}
								log.debug('exp scheduleId after sub- ', scheduleId);

							}

							if ((gstType != '' && gstType != null) && (scheduleId != '' && scheduleId != null)) {

								//Search on GST Tax Code Matrix to get the tax code, reversal tax code, reversal purchase and payable items for cgst, sgst and igst.
								var filterTaxCodeMatrix = new Array();

								filterTaxCodeMatrix.push(search.createFilter({
									name: 'isinactive',
									operator: search.Operator.IS,
									values: false
								}));

								filterTaxCodeMatrix.push(search.createFilter({
									name: 'custrecord_gst_type',
									operator: search.Operator.IS,
									values: gstType
								}));

								filterTaxCodeMatrix.push(search.createFilter({
									name: 'custrecord_gst_item_schedule',
									operator: search.Operator.IS,
									values: scheduleId
								}));

									var columnTaxCodeMatrix = [];

									columnTaxCodeMatrix.push(search.createColumn({
										name: 'custrecord_gst_tax_code'
									}));

									columnTaxCodeMatrix.push(search.createColumn({
										name: 'custrecord_sgst_revpur_item'
									}));

									columnTaxCodeMatrix.push(search.createColumn({
										name: 'custrecord_sgst_revpay_item'
									}));

									columnTaxCodeMatrix.push(search.createColumn({
										name: 'custrecord_cgst_revpur_item'
									}));

									columnTaxCodeMatrix.push(search.createColumn({
										name: 'custrecord_cgst_revpay_item'
									}));

									columnTaxCodeMatrix.push(search.createColumn({
										name: 'custrecord_igst_revpur_item'
									}));

									columnTaxCodeMatrix.push(search.createColumn({
										name: 'custrecord_igst_revpay_item'
									}));

									columnTaxCodeMatrix.push(search.createColumn({
										name: 'custrecord_gst_reversal_taxcode'
									}));

									var searchTaxCodeMatrix = search.create({
										"type": "customrecord_gst_tax_code_matrix",
										"filters": filterTaxCodeMatrix,
										"columns": columnTaxCodeMatrix
									});

									var arraySearchTaxCodeMatrix = searchTaxCodeMatrix.run().getRange({
										start: 0,
										end: 1
									});

									//If search record found. Get the values of tax code, reversal tax code, and all the reversal items of cgst, sgst and igst.
									if (arraySearchTaxCodeMatrix[0] != '' && arraySearchTaxCodeMatrix[0] != null && arraySearchTaxCodeMatrix[0] != undefined && arraySearchTaxCodeMatrix[0] != 'null' && arraySearchTaxCodeMatrix[0] != 'undefined') {

										getTaxCode = arraySearchTaxCodeMatrix[0].getValue('custrecord_gst_tax_code');
										log.debug("Inside if search record found on edit expense:", 'getTaxCode ' + getTaxCode);
										revSGSTPurchaseItem = arraySearchTaxCodeMatrix[0].getValue('custrecord_sgst_revpur_item');
										revSGSTPayableItem = arraySearchTaxCodeMatrix[0].getValue('custrecord_sgst_revpay_item');
										revCGSTPurchaseItem = arraySearchTaxCodeMatrix[0].getValue('custrecord_cgst_revpur_item');
										revCGSTPayableItem = arraySearchTaxCodeMatrix[0].getValue('custrecord_cgst_revpay_item');
										revIGSTPurchaseItem = arraySearchTaxCodeMatrix[0].getValue('custrecord_igst_revpur_item');
										revIGSTPayableItem = arraySearchTaxCodeMatrix[0].getValue('custrecord_igst_revpay_item');
										revTaxCode = arraySearchTaxCodeMatrix[0].getValue('custrecord_gst_reversal_taxcode');

										log.debug("Inside if search record found.", 'exp getTaxCode : ' + getTaxCode + ' exp revSGSTPurchaseItem ' + revSGSTPurchaseItem + ' exp revSGSTPayableItem ' + revSGSTPayableItem);
										log.debug("Inside if search record found.", 'exp revCGSTPurchaseItem ' + revCGSTPurchaseItem + ' exp revCGSTPayableItem ' + revCGSTPayableItem);
										log.debug("Inside if search record found.", 'exp revIGSTPurchaseItem ' + revIGSTPurchaseItem + ' exp revIGSTPayableItem ' + revIGSTPayableItem + ' exp revTaxCode ' + revTaxCode);

									}
							}
							//gets the Exp Account from items to set the line level of expense tab while reversal apply after submit.
							if (revSGSTPurchaseItem) {

								var expAcctSGSTPurchase = search.lookupFields({
									type: 'item',
									id: revSGSTPurchaseItem,
									columns: 'expenseaccount'
								});

								if (expAcctSGSTPurchase) {
									var expAcctSGSTPurchaseAcctID = expAcctSGSTPurchase.expenseaccount[0].value;
									log.debug('On edit mode SGST pur acct ID', expAcctSGSTPurchaseAcctID);


								}
							}
							if (revSGSTPayableItem) {
								var expAcctSGSTPayable = search.lookupFields({
									type: 'item',
									id: revSGSTPayableItem,
									columns: 'expenseaccount'
								});

								if (expAcctSGSTPayable) {
									var expAcctSGSTPayableAcctID = expAcctSGSTPayable.expenseaccount[0].value;
									log.debug('On edit mode SGST pay acct ID', expAcctSGSTPayableAcctID);


								}
							}

							if (revCGSTPurchaseItem) {

								var expAcctCGSTPurchase = search.lookupFields({
									type: 'item',
									id: revCGSTPurchaseItem,
									columns: 'expenseaccount'
								});

								if (expAcctCGSTPurchase) {
									var expAcctCGSTPurchaseAcctID = expAcctCGSTPurchase.expenseaccount[0].value;
									log.debug('On edit mode CGST pur acct ID', expAcctCGSTPurchaseAcctID);
								}
							}

							if (revCGSTPayableItem) {

								var expAcctCGSTPayable = search.lookupFields({
									type: 'item',
									id: revCGSTPayableItem,
									columns: 'expenseaccount'
								});
								if (expAcctCGSTPayable) {
									var expAcctCGSTPayableAcctID = expAcctCGSTPayable.expenseaccount[0].value;
									log.debug('On edit mode CGST pay acct ID', expAcctCGSTPayableAcctID);
								}
							}

							if (revIGSTPurchaseItem) {

								var expAcctIGSTPurchase = search.lookupFields({
									type: 'item',
									id: revIGSTPurchaseItem,
									columns: 'expenseaccount'
								});
								if (expAcctIGSTPurchase) {
									var expAcctIGSTPurchaseAcctID = expAcctIGSTPurchase.expenseaccount[0].value;
									log.debug('On edit mode IGST pur acct ID', expAcctIGSTPurchaseAcctID);


								}
							}

							if (revIGSTPayableItem) {

								var expAcctIGSTPayable = search.lookupFields({
									type: 'item',
									id: revIGSTPayableItem,
									columns: 'expenseaccount'
								});
								if (expAcctIGSTPayable) {
									var expAcctIGSTPayableAcctID = expAcctIGSTPayable.expenseaccount[0].value;
									log.debug('On edit mode IGST pay acct ID', expAcctIGSTPayableAcctID);


								}
							}

							//Variables declared to store the rates respectively.
							var cgstRate, sgstRate, igstRate;

							//Variable declared to flag gst type as inter or intra. this is done to avoid hard-code of inter and intra id's.
							var isIGST = 'F';

							//Load Tax-group to get the "cgst and sgst" or "igst" rates for reversal calculation.
							var loadTaxGroup = record.load({
								type: record.Type.TAX_GROUP,
								id: getTaxCode
							});

							var taxLineItems = loadTaxGroup.getLineCount({
								sublistId: 'taxitem'
							});

							for (var t = 0; t < taxLineItems; t++) {

								//Get the tax name and split to compare the gst type and get the rate accordingly.
								var taxname = loadTaxGroup.getSublistValue({
									sublistId: 'taxitem',
									fieldId: 'taxname2',
									line: t
								});
								log.debug("on edit exp taxname:- ", taxname);

								taxname = taxname.split("_");
								taxname = taxname.toLocaleString().toLowerCase().split(',');

								//Gets the CGST rate
								if (taxname.indexOf(cgst) >= 0) {

									cgstRate = loadTaxGroup.getSublistValue({
										sublistId: 'taxitem',
										fieldId: 'rate',
										line: t
									});
									log.debug('on edit exp cgstRate', cgstRate);

								}

								//Gets the SGST rate
								if (taxname.indexOf(sgst) >= 0) {

									sgstRate = loadTaxGroup.getSublistValue({
										sublistId: 'taxitem',
										fieldId: 'rate',
										line: t
									});
									log.debug('on edit exp sgstRate', sgstRate);

								}

								//Gets the IGST rate
								if (taxname.indexOf(igst) >= 0) {

									isIGST = 'T';
									igstRate = loadTaxGroup.getSublistValue({
										sublistId: 'taxitem',
										fieldId: 'rate',
										line: t
									});
									log.debug('on edit exp igstRate', igstRate);


								}

							}

							log.debug('exp edit IGST', isIGST);

							//Total is calculated of all the lines to be set on total CGST, SGST and IGST fields for print.
							if (isIGST == 'T' || isIGST == "T") {

								var purchaseAmountigst = getAmount * (igstRate / 100);
								var negativeAmountigst = -purchaseAmountigst;

								totalIgstAmount = Number(totalIgstAmount) + Number(purchaseAmountigst);
								log.debug("exp totalIgstAmount:- ", totalIgstAmount);

							} else if (isIGST == 'F' || isIGST == "F") {

								var purchaseAmountcgst = getAmount * (cgstRate / 100);
								var negativeAmountcgst = -purchaseAmountcgst;

								var purchaseAmountsgst = getAmount * (sgstRate / 100);
								var negativeAmountsgst = -purchaseAmountsgst;

								totalCgstAmount = Number(totalCgstAmount) + Number(purchaseAmountcgst);
								totalSgstAmount = Number(totalSgstAmount) + Number(purchaseAmountsgst);

								log.debug("exp totalCgstAmount:- ", totalCgstAmount);
								log.debug("exp totalSgstAmount:- ", totalSgstAmount);

							}

							//If reversal check-box is checked the reversal calculations to be done on edit the record.
							if (isReversal == true && reversalProcess == true) {
								log.debug("reversal apply is true and process is true on expense while edit the record ");

								// true process while checked of reversal line.
								/*billObject.setSublistValue({
			           sublistId: 'expense',
			           fieldId: 'custcol_gst_reversal_process',
			     line: 0,
			           value: true
			       });*/
								billObject.selectLine({
									sublistId: 'expense',
									line: p
								});

								log.debug("on edit set line value:- ", p);

								billObject.setCurrentSublistValue({
									sublistId: 'expense',
									fieldId: 'taxcode',
									value: revTaxCode
								});

								billObject.commitLine({
									sublistId: 'expense'
								});


								//If isIGST is true - GST type is considered as Inter.
								if (isIGST == 'T' || isIGST == "T") {

									log.debug('tempCountExpense ra is f ', tempCountExp);
									log.debug('tempCountExpense+1 ra is f', tempCountExp + 1);


									billObject.selectNewLine({
										sublistId: 'expense'
									});

									//Set IGST Purchase Item and Calculated IGST Rate and Amount.

									// billObject.setCurrentSublistValue({
									// sublistId: 'expense',
									// fieldId: 'custcol_gst_reversal_process',
									// value: true
									// });

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'account',
										value: expAcctIGSTPurchaseAcctID
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'rate',
										value: purchaseAmountigst
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'amount',
										value: purchaseAmountigst
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'taxcode',
										value: revTaxCode
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'custcol_gst_reversal_apply',
										value: true
									});

									billObject.setCurrentSublistValue({ //Added location...
										sublistId: 'expense',
										fieldId: 'location',
										value: getLoc
									});

									billObject.setCurrentSublistValue({ //Added Department...
										sublistId: 'expense',
										fieldId: 'department',
										value: getDept
									});


									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'custcol_gst_igstrate',
										value: igstRate
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'custcol_gst_igstamount',
										value: purchaseAmountigst
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'custcol_gst_cgstrate',
										value: 0
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'custcol_gst_cgstamount',
										value: 0
									});


									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'custcol_gst_sgstrate',
										value: 0
									});


									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'custcol_gst_sgstamount',
										value: 0
									});

									billObject.commitLine({
										sublistId: 'expense'
									});

									//Set IGST Payable Item's acct and Calculated Negative IGST Rate and Amount on the second line by selecting the item.
									billObject.selectNewLine({
										sublistId: 'expense'
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'account',
										value: expAcctIGSTPayableAcctID
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'rate',
										value: negativeAmountigst
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'amount',
										value: negativeAmountigst
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'taxcode',
										value: revTaxCode
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'custcol_gst_reversal_apply',
										value: true
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'location',
										value: getLoc
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'department',
										value: getDept
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'custcol_gst_igstrate',
										value: igstRate
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'custcol_gst_igstamount',
										value: purchaseAmountigst
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'custcol_gst_cgstrate',
										value: 0
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'custcol_gst_cgstamount',
										value: 0
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'custcol_gst_sgstrate',
										value: 0
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'custcol_gst_sgstamount',
										value: 0
									});

									tempCountExp = tempCountExp + 2;

									billObject.commitLine({
										sublistId: 'expense'
									});

								}
								//If isIGST is false - GST Type is considered as Intra.
								else if (isIGST == 'F' || isIGST == "F") {

									//Set SGST Purchase Acct and Calculated Negative IGST Rate and Amount.
									billObject.selectNewLine({
										sublistId: 'expense'
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'account',
										value: expAcctSGSTPurchaseAcctID
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'rate',
										value: purchaseAmountsgst
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'amount',
										value: purchaseAmountsgst
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'taxcode',
										value: revTaxCode
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'custcol_gst_sgstrate',
										value: sgstRate
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'custcol_gst_sgstamount',
										value: purchaseAmountsgst
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'custcol_gst_cgstrate',
										value: 0
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'custcol_gst_cgstamount',
										value: 0
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'custcol_gst_igstrate',
										value: 0
									});
									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'custcol_gst_igstamount',
										value: 0
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'custcol_gst_reversal_apply',
										value: true
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'location',
										value: getLoc
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'department',
										value: getDept
									});


									billObject.commitLine({
										sublistId: 'expense'
									});

									//Set SGST Payable Acct and Calculated Negative SGST Rate and Amount.
									billObject.selectNewLine({
										sublistId: 'expense'
									});

									log.debug('sgst pay acct', expAcctSGSTPayable);

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'account',
										value: expAcctSGSTPayableAcctID
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'rate',
										value: negativeAmountsgst
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'amount',
										value: negativeAmountsgst
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'taxcode',
										value: revTaxCode
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'custcol_gst_sgstrate',
										value: sgstRate
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'custcol_gst_sgstamount',
										value: purchaseAmountsgst
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'custcol_gst_cgstrate',
										value: 0
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'custcol_gst_cgstamount',
										value: 0
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'custcol_gst_igstrate',
										value: 0
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'custcol_gst_igstamount',
										value: 0
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'custcol_gst_reversal_apply',
										value: true
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'location',
										value: getLoc
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'department',
										value: getDept
									});

									billObject.commitLine({
										sublistId: 'expense'
									});

									//On 3rd line of CGST calculations....
									billObject.selectNewLine({
										sublistId: 'expense'
									});
									//Set CGST Purchase Item's acct and Calculated CGST Rate and Amount.

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'account',
										value: expAcctCGSTPurchaseAcctID
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'rate',
										value: purchaseAmountcgst
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'amount',
										value: purchaseAmountcgst
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'taxcode',
										value: revTaxCode
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'custcol_gst_cgstrate',
										value: cgstRate
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'custcol_gst_cgstamount',
										value: purchaseAmountcgst
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'custcol_gst_sgstrate',
										value: 0
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'custcol_gst_sgstamount',
										value: 0
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'custcol_gst_igstrate',
										value: 0
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'custcol_gst_igstamount',
										value: 0
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'custcol_gst_reversal_apply',
										value: true
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'location',
										value: getLoc
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'department',
										value: getDept
									});

									billObject.commitLine({
										sublistId: 'expense'
									});

									//4th line CGST Payable expense acct...
									billObject.selectNewLine({
										sublistId: 'expense'
									});

									//Set CGST Payable Item's acct and Calculated Negative CGST Rate and Amount.

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'account',
										value: expAcctCGSTPayableAcctID
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'rate',
										value: negativeAmountcgst
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'amount',
										value: negativeAmountcgst
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'taxcode',
										value: revTaxCode
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'custcol_gst_cgstrate',
										value: cgstRate
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'custcol_gst_cgstamount',
										value: purchaseAmountcgst
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'custcol_gst_sgstrate',
										value: 0
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'custcol_gst_sgstamount',
										value: 0
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'custcol_gst_igstrate',
										value: 0
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'custcol_gst_igstamount',
										value: 0
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'custcol_gst_reversal_apply',
										value: true
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'location',
										value: getLoc
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'department',
										value: getDept
									});

									tempCountExp = tempCountExp + 4;
									billObject.commitLine({
										sublistId: 'expense'
									});

								}
							}

							//-------2---------------
							//if Reversal alrady applied on expense then set these values.
							if (isReversal == true && reversalProcess == false) {
								log.debug("reversal checkbox is true and process is true on edit mode");

								billObject.selectLine({
									sublistId: 'expense',
									line: p
								});

								log.debug("set line value on edit :- ", p);

								billObject.setCurrentSublistValue({
									sublistId: 'expense',
									fieldId: 'taxcode',
									value: revTaxCode
								});

								billObject.setCurrentSublistValue({
									sublistId: 'expense',
									fieldId: 'custcol_gst_reversal_process',
									value: true
								});


								billObject.commitLine({
									sublistId: 'expense'
								});

								//If isIGST is true - GST type is considered as Inter on edit.
								if (isIGST == 'T' || isIGST == "T") {

									log.debug('expense tempCountExp', tempCountExp);
									log.debug('expense tempCountExp+1', tempCountExp + 1);

									billObject.selectNewLine({
										sublistId: 'expense'
									});

									//Set IGST Purchase Acct and Calculated IGST Rate and Amount.

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'account',
										value: expAcctIGSTPurchaseAcctID
									});


									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'rate',
										value: purchaseAmountigst
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'amount',
										value: purchaseAmountigst
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'taxcode',
										value: revTaxCode
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'custcol_gst_reversal_apply',
										value: true
									});

									billObject.setCurrentSublistValue({ //Added location...
										sublistId: 'expense',
										fieldId: 'location',
										value: getLoc
									});

									billObject.setCurrentSublistValue({ //Added Department...
										sublistId: 'expense',
										fieldId: 'department',
										value: getDept
									});


									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'custcol_gst_igstrate',
										value: igstRate
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'custcol_gst_igstamount',
										value: purchaseAmountigst
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'custcol_gst_cgstrate',
										value: 0
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'custcol_gst_cgstamount',
										value: 0
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'custcol_gst_sgstrate',
										value: 0
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'custcol_gst_sgstamount',
										value: 0
									});

									billObject.commitLine({
										sublistId: 'expense'
									});

									//Set IGST Payable Acct and Calculated Negative IGST Rate and Amount on the second line by selecting the item.
									billObject.selectNewLine({
										sublistId: 'expense'
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'account',
										value: expAcctIGSTPayableAcctID
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'rate',
										value: negativeAmountigst
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'amount',
										value: negativeAmountigst
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'taxcode',
										value: revTaxCode
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'custcol_gst_reversal_apply',
										value: true
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'location',
										value: getLoc
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'department',
										value: getDept
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'custcol_gst_igstrate',
										value: igstRate
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'custcol_gst_igstamount',
										value: purchaseAmountigst
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'custcol_gst_cgstrate',
										value: 0
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'custcol_gst_cgstamount',
										value: 0
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'custcol_gst_sgstrate',
										value: 0
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'custcol_gst_sgstamount',
										value: 0
									});

									tempCountExp = tempCountExp + 2;

									billObject.commitLine({
										sublistId: 'expense'
									});

								}

								//If isIGST is false - GST Type is considered as Intra.
								else if (isIGST == 'F' || isIGST == "F") {

									billObject.selectNewLine({
										sublistId: 'expense'
									});

									//Set SGST Purchase Acct and Calculated SGST Rate and Amount.

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'account',
										value: expAcctSGSTPurchaseAcctID
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'rate',
										value: purchaseAmountsgst
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'amount',
										value: purchaseAmountsgst
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'taxcode',
										value: revTaxCode
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'custcol_gst_sgstrate',
										value: sgstRate
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'custcol_gst_sgstamount',
										value: purchaseAmountsgst
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'custcol_gst_cgstrate',
										value: 0
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'custcol_gst_cgstamount',
										value: 0
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'custcol_gst_igstrate',
										value: 0
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'custcol_gst_igstamount',
										value: 0
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'custcol_gst_reversal_apply',
										value: true
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'location',
										value: getLoc
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'department',
										value: getDept
									});

									billObject.commitLine({
										sublistId: 'expense'
									});

									//if condition is F then set on second line...
									billObject.selectNewLine({
										sublistId: 'expense'
									});

									//Set SGST Payable item's acct and Calculated Negative SGST Rate and Amount.

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'account',
										value: expAcctSGSTPayableAcctID
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'rate',
										value: negativeAmountsgst
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'amount',
										value: negativeAmountsgst
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'taxcode',
										value: revTaxCode
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'custcol_gst_sgstrate',
										value: sgstRate
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'custcol_gst_sgstamount',
										value: purchaseAmountsgst
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'custcol_gst_cgstrate',
										value: 0
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'custcol_gst_cgstamount',
										value: 0
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'custcol_gst_igstrate',
										value: 0
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'custcol_gst_igstamount',
										value: 0
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'custcol_gst_reversal_apply',
										value: true
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'location',
										value: getLoc
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'department',
										value: getDept
									});

									billObject.commitLine({
										sublistId: 'expense'
									});

									//On 3rd line of CGST Purchase item's acct calculations....

									billObject.selectNewLine({
										sublistId: 'expense'
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'account',
										value: expAcctCGSTPurchaseAcctID
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'rate',
										value: purchaseAmountcgst
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'amount',
										value: purchaseAmountcgst
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'taxcode',
										value: revTaxCode
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'custcol_gst_cgstrate',
										value: cgstRate
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'custcol_gst_cgstamount',
										value: purchaseAmountcgst
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'custcol_gst_sgstrate',
										value: 0
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'custcol_gst_sgstamount',
										value: 0
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'custcol_gst_igstrate',
										value: 0
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'custcol_gst_igstamount',
										value: 0
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'custcol_gst_reversal_apply',
										value: true
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'location',
										value: getLoc
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'department',
										value: getDept
									});

									billObject.commitLine({
										sublistId: 'expense'
									});

									//4th line CGST Payable expense acct...
									billObject.selectNewLine({
										sublistId: 'expense'
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'account',
										value: expAcctCGSTPayableAcctID
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'rate',
										value: negativeAmountcgst
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'amount',
										value: negativeAmountcgst
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'taxcode',
										value: revTaxCode
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'custcol_gst_cgstrate',
										value: cgstRate
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'custcol_gst_cgstamount',
										value: purchaseAmountcgst
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'custcol_gst_sgstrate',
										value: 0
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'custcol_gst_sgstamount',
										value: 0
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'custcol_gst_igstrate',
										value: 0
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'custcol_gst_igstamount',
										value: 0
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'custcol_gst_reversal_apply',
										value: true
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'location',
										value: getLoc
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'department',
										value: getDept
									});

									tempCountExp = tempCountExp + 4;
									billObject.commitLine({
										sublistId: 'expense'
									});
								}
							}

							//false /false.....
							if (isReversal == false && reversalProcess == false) {

								if (isIGST == 'T' || isIGST == "T") {
									log.debug("taxCodeId else on edit of fnf:- ", taxCodeId);

									billObject.selectLine({
										sublistId: 'expense',
										line: p
									});

									//Set the IGST rate and calculated amount for the expense selected.

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'taxcode',
										value: getTaxCode
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'custcol_gst_igstrate',
										value: igstRate
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'custcol_gst_igstamount',
										value: purchaseAmountigst
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'custcol_gst_cgstrate',
										value: 0
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'custcol_gst_cgstamount',
										value: 0
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'custcol_gst_sgstrate',
										value: 0
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'custcol_gst_sgstamount',
										value: 0
									});

									billObject.commitLine({
										sublistId: 'expense'
									});

								} else if (isIGST == 'F' || isIGST == "F") {

									billObject.selectLine({
										sublistId: 'expense',
										line: e
									});

									//Set the cgst and sgst rate and amount for the expense selected.
									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'taxcode',
										value: getTaxCode
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'custcol_gst_cgstrate',
										value: cgstRate
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'custcol_gst_cgstamount',
										value: purchaseAmountcgst
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'custcol_gst_sgstrate',
										value: sgstRate
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'custcol_gst_sgstamount',
										value: purchaseAmountsgst
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'custcol_gst_igstrate',
										value: 0
									});

									billObject.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'custcol_gst_igstamount',
										value: 0
									});

									billObject.commitLine({
										sublistId: 'expense'
									});

								}
							}
						} //Discount Item's acct condition.
					} //End of CountLineOfExp Loop.
				}

				//Set Total CGST, SGST and IGST in body fields.
				if (isIGST == 'F' || isIGST == "F") {

					billObject.setValue({
						fieldId: 'custbody_gst_totalcgst',
						value: totalCgstAmount
					});
					billObject.setValue({
						fieldId: 'custbody_gst_totalsgst',
						value: totalSgstAmount
					});
					billObject.setValue({
						fieldId: 'custbody_gst_totaligst',
						value: 0
					});

				} else if (isIGST == 'T' || isIGST == "T") {

					billObject.setValue({
						fieldId: 'custbody_gst_totaligst',
						value: totalIgstAmount
					});
					billObject.setValue({
						fieldId: 'custbody_gst_totalcgst',
						value: 0
					});
					billObject.setValue({
						fieldId: 'custbody_gst_totalsgst',
						value: 0
					});
				}

				var recordIdOnedit = billObject.save();
				log.debug('Record saved id on edit mode:- ', recordIdOnedit);

			} catch (exp) {
				log.debug('Exception Log', exp.id);
				log.debug('Exception Log', exp.message);
			}
		}

		function discountItemsAcct() {
			// Array for list of discount Items...
			var discountItemIds = [];
			var discountAcctIds = [];

			//Load Search for discount Items to set tax code ...
			var discountItemSearch = search.load({
				id: 'customsearch_tds_wht_items'
			});
			log.debug('discountItemSearch:- ', JSON.stringify(discountItemSearch));

			var arrDiscountItems = discountItemSearch.run().getRange({
				start: 0,
				end: 1000
			});

			for (var t = 0; t < arrDiscountItems.length; t++) {
				var discountId = arrDiscountItems[t].getValue({
					name: 'internalid'
				});
				discountItemIds.push(discountId);

				var disAcctId = arrDiscountItems[t].getValue({
					name: 'expenseaccount'
				});
				discountAcctIds.push(disAcctId);

			}
			log.debug('discountItemIds list:- : ', JSON.stringify(discountItemIds));
			log.debug('discountAcctIds list:- : ', JSON.stringify(discountAcctIds));

			var returnJSON = [];
			returnJSON.push({
				discountItemIds: discountItemIds,
				discountAcctIds: discountAcctIds

			});

			return returnJSON;
		}

		return {
			beforeLoad: beforeLoad,
			beforeSubmit: beforeSubmit,
			afterSubmit: afterSubmit
		};
	});