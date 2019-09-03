function beforeLoad_showPrintButton(type, form) {
    nlapiLogExecution('Debug', 'bbbbbbbbb', type);

    // button should be displayed on view mode
    if (type == 'view') {
        var action = '';
        var recType = nlapiGetRecordType();
        var recId = nlapiGetRecordId();

        nlapiLogExecution('Debug', 'Record Details', 'recType ' + recType +
            ' recId ' + recId);

        if (recType == 'vendorbill')
            action = '&action=VendorBillPrint';
        if (recType == 'vendorpayment')
            action = '&action=VendorPaymentPrint';

        if (recId != '' && recId != null) {
            // get the line item count for finding the itemId
            var itemCount = nlapiGetLineItemCount('item');

            // if itemId is same as the Itemvalue then the print button is
            // displayed.

            var loadRecord = nlapiLoadRecord(recType, recId);
            var merchant = loadRecord.getFieldValue('entity');
            var Bill_Id = recId;
            // url is hardcoded since resolve url isn't working.
            var url = nlapiResolveURL('SUITELET',
                'customscript_softype_tb_st_vendorbill',
                'customdeploy_softype_tb_st_vendorbill');
            nlapiLogExecution('Debug', 'URL', url);
            url += action;
            url += '&recId=' + recId;
            url += '&recType=' + recType;

            nlapiLogExecution('Debug', 'URL 2', url);

            var stringScript = "window.open('" +
                url +
                "','_blank','toolbar=yes, location=yes, status=yes, menubar=yes, scrollbars=yes')";
            nlapiLogExecution('Debug', 'stringScript', stringScript);

            var loadrec = nlapiLoadRecord(recType, recId);
            var Selfbillchkbox = loadrec
                .getFieldValue('custbody_tb_self_billing');
            nlapiLogExecution('Debug', 'Selfbillchkbox', Selfbillchkbox);
            // print button is added in the form
            if (recType == 'vendorbill') {
                if (Selfbillchkbox == 'T' || Selfbillchkbox == 'yes') {
                    var customButton = form.addButton('custpage_Vendorbill',
                        'Print', stringScript);
                    nlapiLogExecution('Debug', 'next');

                }
            } else if (recType == 'vendorpayment') {
                var customButton = form.addButton('custpage_Vendorbill',
                    'Print', stringScript);
                nlapiLogExecution('Debug', 'next');
            }

        }

    }

}