/**
 * Copyright (c) 2006-2012 NetCloud (NetSuite-IL), Ltd. Israel
 * All Rights Reserved.
 * 
 * This software is the Israeli Localization of NetSuite in accordance 
 * to the Israeli Government Financial Regulation.
 */
function PrintPDF(request, response) {

    //get the action sent in the url
    var action = request.getParameter('action');
    var recid = request.getParameter('recId');
    nlapiLogExecution('Debug', 'recid', recid);


    if (action == 'VendorBillPrint') {

        var RecId = request.getParameter('recId');
        var RecType = request.getParameter('recType');
        var LoadRec = nlapiLoadRecord(RecType, RecId);
        var TranId = LoadRec.getFieldValue('tranid');
        var TranDate = LoadRec.getFieldValue('trandate');
        var currency = LoadRec.getFieldText('currency');
        var PaymentofTerms = LoadRec.getFieldText('terms');
        var Sub = LoadRec.getFieldValue('subsidiary');
        var SubLookup = nlapiLookupField('subsidiary', Sub, ['legalname', 'email', 'custrecordcustrecordphone', 'url']);
        var SubName = SubLookup.legalname;
        var SubEmail = SubLookup.email;
        var SubPhone = SubLookup.custrecordcustrecordphone;
        var url = SubLookup.url;
        var BillAdress = LoadRec.getFieldValue('billaddress');
        var DestState = LoadRec.getFieldText('custbody_gst_destinationstate');

        var id = LoadRec.getFieldValue('entity');
        var LoadRecord = nlapiLoadRecord('vendor', id);
        var count = LoadRecord.getLineItemCount('addressbook');
        nlapiLogExecution('Debug', 'count  ', count);
        var account = LoadRecord.getFieldValue('entityid');
        for (var i = 1; i <= count; i++) {
            var defaultBilling = LoadRecord.getLineItemValue('addressbook', 'defaultbilling', i);
            nlapiLogExecution('Debug', 'defaultBilling  ', defaultBilling);
            if (defaultBilling == 'T') {


                var subrecord = LoadRecord.viewLineItemSubrecord('addressbook', 'addressbookaddress', i);
                nlapiLogExecution('Debug', 'subrecord  ', subrecord);
                var addresstext = subrecord.getFieldValue('custrecord_gst_state_code');
                nlapiLogExecution('Debug', 'addresstext  ', addresstext);
                break;
            }
        }


        var Subs = nlapiLoadRecord('subsidiary', Sub);
        var SubAdress = Subs.getFieldValue('mainaddress_text');

        nlapiLogExecution('Debug', 'SubAdress', SubAdress);
        var logo = "https://system.eu1.netsuite.com/core/media/media.nl?id=236&c=3912882_SB1&h=558484cd35a1a6b99c5b";



        var html = '';
        html += '<?xml version=\"1.0\"?>\n<!DOCTYPE pdf PUBLIC \"-//big.faceless.org//report\" \"report-1.1.dtd\">';
        html += '<pdf>';
        html += '<head>';

        //custcol_gst_reversal_apply

        html += '<macrolist>';
        html += '<macro id="nlheader">';
        html += '<table class="header" style="border-collapse: collapse;"><tr class="spaceUnder">';
        html += '<td colspan="1" rowspan="1"></td>';
        html += '<td>&nbsp;</td>';
        html += '<td align="right" rowspan="9">';

        html += '<table><tr>';
        html += '<td class="addressheader" colspan="3"><b><br/><br/><br/>Vendor:</b></td>';
        html += '<td colspan="5">&nbsp;</td>';
        html += '</tr>';
        html += '<tr>';
        html += '<td class="address"><p style="width:225px;height:30px;font-size: 12px;align:left;border-top: 1px solid black;border-left: 1px solid black;border-right: 1px solid black">' + BillAdress + '</p></td>';
        html += '<td align="right" colspan="7">&nbsp;</td>';
        html += '</tr>';

        html += '<tr>';
        html += '<td class="address" colspan="9" style="border-left: 1px solid black;border-right: 1px solid black">Place of Supply: ' + DestState + '</td>';
        html += '</tr>';
        html += '<tr>';
        html += '<td class="address" colspan="9" style="border-left: 1px solid black;border-right: 1px solid black;border-bottom:1px">Code: ' + addresstext + '</td>';
        html += '</tr>';

        html += '<tr>';
        html += '<td class="address" colspan="9" style="border-left: 1px solid black;border-right: 1px solid black;border-bottom:1px">Account# ' + account + '</td>';
        html += '</tr>';
        html += '</table>'
        html += '</td>';
        html += '</tr>';
        html += '<tr>';
        html += '<td style="padding:0px;"><img src="' + nlapiEscapeXML(logo) + '" style="height: 35px; width: 200px;" /></td>';
        html += '</tr>';
        html += '<tr>';
        html += '<td colspan="2"><span style="font-size: 12px;padding-top:-1px">' + nlapiEscapeXML(SubName) + '</span><br/><p style="width:130px;height:10px;font-size: 12px;align:left;">' + nlapiEscapeXML(SubAdress) + '</p></td>';
        html += '</tr>';
        html += '<tr>';
        html += '<td colspan="2"><span align="right"><u>' + SubEmail + '</u><br/><u>' + url + '</u></span></td>';
        html += '</tr>';
        html += '</table>';
        html += '</macro>';
        html += '<macro id="nlfooter">';
        html += '<table class="footer"><tr>';
        html += '<td clospan="12" align="right"><pagenumber/> of <totalpages/></td>';
        html += '</tr></table>';
        html += '<br/><br/>';
        html += '</macro>';
        html += '</macrolist>';
        html += '<style type="text/css">';
        html += '	table {';
        html += '		font-family: sans-serif;';
        html += 'font-size: 9pt;';
        html += 'margin-top: 10px;';
        html += 'table-layout: fixed;';
        html += 'height: 100%;';
        html += 'width: 100%;';
        html += 'page-break-inside: avoid';
        html += 'border-collapse: collapse;';
        html += '}';
        html += '	div.fixed {';
        html += '   position: fixed;';
        html += '   bottom: 0;';
        html += '    right: 0;';
        html += '   width: 300px;';
        html += '  border: 3px solid #73AD21;';
        html += '}';
        html += 'th {';
        html += 'font-weight: bold;';
        html += 'font-size: 8pt;';
        html += 'vertical-align: middle;';
        html += 'padding-right: 6px;';
        html += 'padding-left: 6px;';
        html += 'padding-bottom: 3px;';
        html += 'padding-top: 5px;';
        html += 'background-color: #e3e3e3;';
        html += 'color: #333333;';
        html += '}';
        html += 'td {';
        html += 'padding-right: 6px;';
        html += 'padding-left: 6px;';
        html += 'padding-bottom: 4px;';
        html += 'padding-top: 4px;';
        html += '}';
        html += '		b {';
        html += '		font-weight: bold;';
        html += '		color: #333333;';
        html += '		}';
        html += 'table.header td {';
        html += 'padding: 0px;';
        html += 'font-size: 10pt;';
        html += '}';
        html += 'thead {';
        html += '	display: table-header-group; ';
        html += '}';
        html += 'table.footer td {';
        html += 'padding: 0px;';
        html += 'font-size: 8pt;';
        html += '}';
        html += 'table.itemtable th {';
        html += 'padding-bottom: 10px;';
        html += 'padding-top: 10px;';
        html += '}';
        html += 'table.body td {';
        html += 'padding-top: 2px;';
        html += '}';
        html += 'table.total {';
        html += 'page-break-inside: avoid;';
        html += '}';
        html += 'tr.totalrow {';
        html += 'background-color: #e3e3e3;';
        html += 'line-height: 200%;';
        html += '}';
        html += 'td.totalboxtop {';
        html += 'font-size: 12pt;';
        html += 'background-color: #e3e3e3;';
        html += '}';
        html += 'td.addressheader {';
        html += 'font-size: 10pt;';
        html += 'padding-top: 6px;';
        html += 'padding-bottom: 2px;';
        html += '}';
        html += 'td.address {';
        html += 'padding-top: 0px;';
        html += '}';
        html += 'td.totalboxmid {';
        html += 'font-size: 28pt;';
        html += 'padding-top: 20px;';
        html += 'background-color: #e3e3e3;';
        html += '}';
        html += 'td.totalboxbot {';
        html += 'background-color: #e3e3e3;';
        html += 'font-weight: bold;';
        html += '}';
        html += 'span.title {';
        html += 'font-size: 28pt;';
        html += '}';
        html += 'span.number {';
        html += 'font-size: 16pt;';
        html += '}';
        html += 'span.itemname {';
        html += 'font-weight: bold;';
        html += 'line-height: 150%;';
        html += 'font-size:8pt;';
        html += '}';
        html += 'hr {';
        html += 'width: 100%;';
        html += 'color: #d3d3d3;';
        html += 'background-color: #d3d3d3;';
        html += 'height: 1px;';
        html += '}';
        html += '	</style>';

        html += '</head>';
        html += '<body header="nlheader" header-height="19%" footer="nlfooter" footer-height="20pt" padding="0.5in 0.5in 0.5in 0.5in" size="Letter">';

        html += '<br/>';
        html += '<table><tr>';
        html += '<td colspan="3"><b>Self billing invoice</b></td>';
        html += '<td colspan="9"></td>';
        html += '</tr>';
        html += '<tr>';
        html += '<td colspan="2">Invoice Number</td>';
        html += '<td colspan="2" class="address"> ' + TranId + '</td>';
        html += '</tr>';
        html += '<tr>';
        html += '<td colspan="2">Invoice Date</td>'
        html += '<td colspan="2" class="address"> ' + TranDate + '</td>';
        html += '</tr>';
        html += '<tr>';
        html += '<td colspan="2">Terms of Payment</td>'
        html += '<td colspan="2" class="address"> ' + PaymentofTerms + '</td>';
        html += '</tr>';
        html += '<tr>';
        html += '<td colspan="2">Currency</td>'
        html += '<td colspan="2" class="address"> ' + currency + '</td>';
        html += '</tr>';
        html += '</table>';



        html += '	<table class="itemtable">';
        html += '	<thead>';
        html += '		<tr>';
        html += '		<th colspan="9" align="center">S.No</th>';
        html += '		<th colspan="11" align="center">Description</th>';
        html += '		<th colspan="9" align="center">Hsn/Sac Code</th>';
        html += '		<th align="center" colspan="6">Quantity</th>';
        html += '		<th align="center" colspan="6">Rate</th>';
        html += '		<th align="center" colspan="6">Taxrate</th>';
        html += '		<th align="center" colspan="6">Amount</th>';
        html += '		</tr>';
        html += '	</thead>';

        var totalAmt = Number(0);
        var LineCount = LoadRec.getLineItemCount('item');
        for (var i = 1; i <= LineCount; i++) {

            var gstreverse = LoadRec.getLineItemValue('item', 'custcol_gst_reversal_apply', i);
            if (gstreverse == 'T') {
                var srno = i;
                var description = LoadRec.getLineItemValue('item', 'description', i);
                if (description == null || description == '') {
                    description = '';
                }
                var gst = LoadRec.getLineItemValue('item', 'custitem_gst_hsnsaccode', i);
                if (gst == null || gst == '') {
                    gst = '';
                }
                var quantity = LoadRec.getLineItemValue('item', 'quantity', i);
                if (quantity == null || quantity == '') {
                    quantity = '';
                }
                var rate = LoadRec.getLineItemValue('item', 'rate', i);
                var taxrate = LoadRec.getLineItemValue('item', 'taxrate1', i);
                var amount = LoadRec.getLineItemValue('item', 'amount', i);

                html += '<tr>';
                html += '<td colspan="9" align="center"><span class="itemname">' + srno + '</span></td>';
                html += '<td colspan="11" align="center"><span class="itemname">' + description + ' </span></td>';
                html += '<td colspan="9" align="center">' + gst + '</td>';
                html += '<td align="center" colspan="6">' + quantity + '</td>';
                html += '<td align="center" colspan="6">' + rate + '</td>';
                html += '<td align="center" colspan="6">' + taxrate + '</td>';
                html += '<td align="center" colspan="6">' + amount + '</td>';
                html += '</tr>';

                totalAmt = Number(totalAmt) + Number(amount);
            }

        }

        html += '</table>';

        html += '<hr />';

        var usertotal = LoadRec.getFieldValue('usertotal');
        if (usertotal == null || usertotal == '') {
            usertotal = '';
        }

        var Subtotal = Number(usertotal) - Number(taxvaue);

        var igst = LoadRec.getFieldValue('custbody_gst_totaligst');
        if (igst == null || igst == '') {
            igst = '';
        }
        var cgst = LoadRec.getFieldValue('custbody_gst_totalcgst');
        if (cgst == null || cgst == '') {
            cgst = '';
        }
        var sgst = LoadRec.getFieldValue('custbody_gst_totalsgst');
        if (sgst == null || sgst == '') {
            sgst = '';
        }
        var taxvaue = igst + cgst + sgst;
        if (taxvaue == null || taxvaue == '') {
            taxvaue = '';
        }

        var amountremaining = LoadRec.getFieldValue('amountremaining');
        var message = LoadRec.getFieldValue('message');
        var cin = LoadRec.getFieldValue('custbody_cin_number');
        var pan = LoadRec.getFieldValue('custbody_sub_pan_no');

        html += '<table class="total">';
        html += '<tr>';
        html += '<td background-color="#ffffff" colspan="5">&nbsp;</td>';
        html += '<td align="right" colspan="2" style="padding-right:-60px;font-size:12px"><b>Total(in figure)</b></td>';
        html += '<td align="right" colspan="2" style="font-size:12px">' + totalAmt.toFixed(2) + '</td>';
        html += '</tr>';
        html += '<tr>';
        html += '<td colspan="3" style="border-top: 1px solid black;border-left: 1px solid black;border-right: 1px solid black"><u>Summary of IGST</u></td>';
        html += '<td colspan="6"></td>';
        html += '</tr>';
        html += '<tr>';
        html += '<td align="left" colspan="1" style="border-left: 1px solid black" ><strong>IGST (18%)</strong></td>';
        html += '<td align="left" colspan="2" style="border-right: 1px solid black">' + igst + '</td>';
        html += '<td colspan="6"></td>';
        html += '</tr>';
        html += '<tr>';
        html += '<td align="left" colspan="1" style="border-left: 1px solid black" ><strong>CGST@ 9%</strong></td>';
        html += '<td align="left" colspan="2" style="border-right: 1px solid black">' + cgst + '</td>';
        html += '</tr>';
        html += '<tr>';
        html += '<td align="left" colspan="1" style="border-left: 1px solid black" ><strong>SGST@ 9%</strong></td>';
        html += '<td align="left" colspan="2" style="border-right: 1px solid black">' + sgst + '</td>';
        html += '</tr>';
        html += '<tr>';
        html += '<td align="left" colspan="1" style="border-bottom: 1px solid black;border-left: 1px solid black" ><strong>Total tax </strong></td>';
        html += '<td align="left" colspan="2" style="border-bottom: 1px solid black;border-right: 1px solid black">' + taxvaue + '</td>';
        html += '</tr>';
        html += '</table>';


        html += '<table  style=" page-break-inside: avoid;"><tr>'; //page-break-inside: avoid;
        html += '	</tr>';
        html += '	<tr style="">';
        html += '	<th align="left" colspan="15">&nbsp;</th>';
        html += '</tr>';
        html += '	<tr>';
        html += '	<td align="center" colspan="12"><span style="font-size: 20px; font-weight: bold;"><!-- Thanks --></span></td>';
        html += '	</tr>';
        html += '	<tr>';
        html += '	<td colspan="12"><span style="width : 10% ;float:left;"><b>CIN : </b></span><span align="right">' + cin + '</span><br /><b>PAN : </b> <span align="right">' + pan + '</span></td>';
        html += '</tr></table>';
        html += '</body>';
        html += '</pdf>';

        var file = nlapiXMLToPDF(html);
        response.setContentType('PDF', 'Print.pdf ', 'inline');
        response.write(file.getValue());
    }

    if (action == 'VendorPaymentPrint') {
        var RecId = request.getParameter('recId');
        nlapiLogExecution('Debug', 'RecId  ', RecId);
        var RecType = request.getParameter('recType');
        nlapiLogExecution('Debug', 'RecType  ', RecType);
        var LoadRec = nlapiLoadRecord(RecType, RecId);
        var TranId = LoadRec.getFieldValue('tranid');
        var TranDate = LoadRec.getFieldValue('trandate');
        var Terms = LoadRec.getFieldText('terms');
        var DueDate = LoadRec.getFieldValue('duedate');
        var Currency = LoadRec.getFieldText('currency');
        var Entity = LoadRec.getFieldValue('entity');
        nlapiLogExecution('Debug', 'Entity  ', Entity);
        var Entityid = nlapiLookupField('vendor', Entity, 'entityid');
        var BillAddress = LoadRec.getFieldValue('address');
        var amountTotal = LoadRec.getFieldValue('total');
        if (BillAddress == null || BillAddress == '') {
            BillAddress = '-';
        }
        var Sub = LoadRec.getFieldValue('subsidiary');
        var SubLookup = nlapiLookupField('subsidiary', Sub, ['legalname', 'email', 'custrecordcustrecordphone', 'url']);
        var SubName = SubLookup.legalname;
        var SubEmail = SubLookup.email;
        var SubPhone = SubLookup.custrecordcustrecordphone;
        var url = SubLookup.url;
        var DestState = LoadRec.getFieldText('custbody_gst_destinationstate');
        var Subs = nlapiLoadRecord('subsidiary', Sub);
        var SubAdress = Subs.getFieldValue('mainaddress_text');
        nlapiLogExecution('Debug', 'SubAdress', SubAdress);
        var logo = "https://system.eu1.netsuite.com/core/media/media.nl?id=236&c=3912882_SB1&h=558484cd35a1a6b99c5b";

        var html = '';
        html += '<?xml version=\"1.0\"?>\n<!DOCTYPE pdf PUBLIC \"-//big.faceless.org//report\" \"report-1.1.dtd\">';
        html += '<pdf>';
        html += '<head>';
        html += '<macrolist>';
        html += '<macro id="nlheader">';
        html += '<table class="header" style="border-collapse: collapse;"><tr class="spaceUnder">';
        html += '<td colspan="2" rowspan="1"></td>';
        html += '<td>&nbsp;</td>';
        html += '<td align="right" rowspan="9">';
        html += '<table><tr>';
        html += '<td colspan="2" ><span style="font-size: 10pt"><b><br/><br/><br/>Payment Voucher<br/></b></span></td>';
        html += '</tr>';
        html += '<tr>';
        html += '<td colspan="2" style="font-size: 10pt;border-left: 1px solid black;border-top: 1px solid black">Voucher Number</td>';
        html += '<td style="font-size: 9pt;border-right: 1px solid black;border-top: 1px solid black" id="rowData">' + TranId + '</td>';
        html += '</tr>';
        html += '<tr>';
        html += '<td colspan="2" style="font-size: 10pt;border-bottom: 1px solid black;border-left: 1px solid black">Voucher Date</td>';
        html += '<td style="font-size: 9pt;border-bottom: 1px solid black;border-right: 1px solid black" id="rowData"><b>' + TranDate + '</b></td>';
        html += '</tr>';
        html += '</table>';
        html += '</td>';
        html += '</tr>';
        html += '<tr>';
        html += '<td style="padding:0px;"><img src="' + nlapiEscapeXML(logo) + '" style="height: 35px; width: 200px;" /></td>';
        html += '</tr>';
        html += '<tr>';
        html += '<td colspan="2"><span style="font-size: 12px;padding-top:-1px">' + nlapiEscapeXML(SubName) + '</span><br/><p style="width:130px;height:10px;font-size: 12px;align:left;">' + nlapiEscapeXML(SubAdress) + '</p></td>';
        html += '</tr>';
        html += '<tr>';
        html += '<td colspan="2"><span align="right"><u>' + SubEmail + '</u><br/><u>' + url + '</u></span></td>';
        html += '</tr>';
        html += '</table>';
        html += '</macro>';
        html += '<macro id="nlfooter">';
        html += '<table class="footer"><tr>';
        html += '<td clospan="12" align="right"><pagenumber/> of <totalpages/></td>';
        html += '</tr></table>';
        html += '<br/><br/>';
        html += '</macro>';
        html += '</macrolist>';


        html += '<style type="text/css">';
        html += '	table {';
        html += '		font-family: sans-serif;';
        html += 'font-size: 9pt;';
        html += 'margin-top: 10px;';
        html += 'table-layout: fixed;';
        html += 'height: 100%;';
        html += 'width: 100%;';
        html += 'page-break-inside: avoid';
        html += 'border-collapse: collapse;';
        html += '}';
        html += '	div.fixed {';
        html += '   position: fixed;';
        html += '   bottom: 0;';
        html += '    right: 0;';
        html += '   width: 300px;';
        html += '  border: 3px solid #73AD21;';
        html += '}';
        html += 'th {';
        html += 'font-weight: bold;';
        html += 'font-size: 8pt;';
        html += 'vertical-align: middle;';
        html += 'padding-right: 6px;';
        html += 'padding-left: 6px;';
        html += 'padding-bottom: 3px;';
        html += 'padding-top: 5px;';
        html += 'background-color: #e3e3e3;';
        html += 'color: #333333;';
        html += '}';
        html += 'td {';
        html += 'padding-right: 6px;';
        html += 'padding-left: 6px;';
        html += 'padding-bottom: 4px;';
        html += 'padding-top: 4px;';
        html += '}';
        html += '		b {';
        html += '		font-weight: bold;';
        html += '		color: #333333;';
        html += '		}';
        html += 'table.header td {';
        html += 'padding: 0px;';
        html += 'font-size: 10pt;';
        html += '}';
        html += 'thead {';
        html += '	display: table-header-group; ';
        html += '}';
        html += 'table.footer td {';
        html += 'padding: 0px;';
        html += 'font-size: 8pt;';
        html += '}';
        html += 'table.itemtable th {';
        html += 'padding-bottom: 10px;';
        html += 'padding-top: 10px;';
        html += '}';
        html += 'table.body td {';
        html += 'padding-top: 2px;';
        html += '}';
        html += 'table.total {';
        html += 'page-break-inside: avoid;';
        html += '}';
        html += 'tr.totalrow {';
        html += 'background-color: #e3e3e3;';
        html += 'line-height: 200%;';
        html += '}';
        html += 'td.totalboxtop {';
        html += 'font-size: 12pt;';
        html += 'background-color: #e3e3e3;';
        html += '}';
        html += 'td.addressheader {';
        html += 'font-size: 10pt;';
        html += 'padding-top: 6px;';
        html += 'padding-bottom: 2px;';
        html += '}';
        html += 'td.address {';
        html += 'padding-top: 0px;';
        html += '}';
        html += 'td.totalboxmid {';
        html += 'font-size: 28pt;';
        html += 'padding-top: 20px;';
        html += 'background-color: #e3e3e3;';
        html += '}';
        html += 'td.totalboxbot {';
        html += 'background-color: #e3e3e3;';
        html += 'font-weight: bold;';
        html += '}';
        html += 'span.title {';
        html += 'font-size: 28pt;';
        html += '}';
        html += 'span.number {';
        html += 'font-size: 16pt;';
        html += '}';
        html += 'span.itemname {';
        html += 'font-weight: bold;';
        html += 'line-height: 150%;';
        html += 'font-size:8pt;';
        html += '}';
        html += 'hr {';
        html += 'width: 100%;';
        html += 'color: #d3d3d3;';
        html += 'background-color: #d3d3d3;';
        html += 'height: 1px;';
        html += '}';
        html += '	</style>';

        html += '</head>';
        html += '<body header="nlheader" header-height="19%" footer="nlfooter" footer-height="20pt" padding="0.5in 0.5in 0.5in 0.5in" size="Letter">';
        var count = LoadRec.getLineItemCount('apply');
        nlapiLogExecution('Debug', 'count  ', count);

        var total = Number(0);
        for (var i = 1; i <= count; i++) {
            var srno = i;
            var isApply = LoadRec.getLineItemValue('apply', 'apply', i);
            if (isApply == 'T') {
                var internalId = LoadRec.getLineItemValue('apply', 'internalid', i);
                var loadBill = nlapiLoadRecord('vendorbill', internalId);
                var LineCount = loadBill.getLineItemCount('item');
                var DestState = loadBill.getFieldText('custbody_gst_destinationstate');
                var internalId = LoadRec.getLineItemValue('apply', 'internalid', i);
                var dateDue = LoadRec.getLineItemValue('apply', 'applydate', i);
                var type = LoadRec.getLineItemValue('apply', 'type', i);
                var referenceNo = LoadRec.getLineItemValue('apply', 'refnum', i);
                var orgAmount = LoadRec.getLineItemValue('apply', 'total', i);
                if (orgAmount == null || orgAmount == '') {
                    orgAmount = '-';
                }
                var amtDue = LoadRec.getLineItemValue('apply', 'due', i);
                var payment = LoadRec.getLineItemValue('apply', 'amount', i);
                var message = loadBill.getFieldValue('message');
                var cin = loadBill.getFieldValue('custbody_cin_number');
                if (cin == null || cin == '') {
                    cin = '-';
                }
                var pan = loadBill.getFieldValue('custbody_sub_pan_no');
                if (pan == null || pan == '') {
                    pan = '-';
                }
                var igst = loadBill.getFieldValue('custbody_gst_totaligst');
                if (igst == null || igst == '') {
                    igst = '';
                }
                for (var j = 1; j <= LineCount; j++) {
                    var applywhtax = loadBill.getLineItemValue('item', 'custcol_4601_witaxapplies', j);
                    if (applywhtax == 'T') {

                        var whtaxamount = loadBill.getLineItemValue('item', 'custcol_4601_witaxamount', j);
                        if (whtaxamount == null || whtaxamount == '') {
                            whtaxamount = '-';
                        }
                        var whAmt = Math.abs(whtaxamount);
                        nlapiLogExecution('Debug', 'whAmt', whAmt);
                        var totalamt = Number(whAmt) + total;
                        if (totalamt == null || totalamt == '') {
                            totalamt = '-';
                        }
                        nlapiLogExecution('Debug', 'totalamt', totalamt);

                    }
                }


            }
        }
        html += '&nbsp;';
        html += '<table><tr>';
        html += '<td class="addressheader" colspan="3"><b>Paid To</b></td>';
        html += '<td colspan="5">&nbsp;</td>';
        html += '</tr>';
        html += '<tr>';
        html += '<td class="address"><p style="width:225px;height:30px;font-size: 12px;align:left;border-top: 1px solid black;border-left: 1px solid black;border-right: 1px solid black;border-bottom: 1px solid black">' + BillAddress + '</p></td>';
        html += '<td align="left" colspan="7">&nbsp;</td>';
        html += '</tr>';

        html += '<tr>';
        html += '<td class="address" colspan="9" style="font-size: 12px">Place of Supply: ' + DestState + '</td>';
        html += '<td align="left" colspan="5">&nbsp;</td>';
        html += '</tr>';

        html += '</table>';


        html += '<table class="itemtable">';
        html += '<thead>';
        html += '<tr>';
        html += '<th colspan="6" align="center" >Due Date</th>';
        html += '<th colspan="5" align="center">Type</th>';
        html += '<th colspan="6" align="center">Reference No.</th>';
        html += '<th align="center" colspan="6">Original Amount</th>';
        html += '<th align="center" colspan="6">Amount Due</th>';
        html += '<th align="center" colspan="6">Payment Amount</th>';
        html += '</tr>';
        html += '</thead>';



        for (var i = 1; i <= count; i++) {
            var isApply = LoadRec.getLineItemValue('apply', 'apply', i);
            if (isApply == 'T') {
                var internalId = LoadRec.getLineItemValue('apply', 'internalid', i);
                var loadBill = nlapiLoadRecord('vendorbill', internalId);
                var LineCount = loadBill.getLineItemCount('item');

                var internalId = LoadRec.getLineItemValue('apply', 'internalid', i);
                var dateDue = LoadRec.getLineItemValue('apply', 'applydate', i);
                var type = LoadRec.getLineItemValue('apply', 'type', i);
                var referenceNo = LoadRec.getLineItemValue('apply', 'refnum', i);
                var orgAmount = LoadRec.getLineItemValue('apply', 'total', i);
                if (orgAmount == null || orgAmount == '') {
                    orgAmount = '-';
                }
                html += '<tr>';
                html += '<td colspan="6" align="center" ><span class="itemname">' + dateDue + '</span></td>';
                html += '<td colspan="5" align="center"><span class="itemname">' + type + ' </span></td>';
                html += '<td colspan="6" align="center">' + referenceNo + '</td>';
                html += '<td align="center" colspan="6" line-height="150%">' + orgAmount + '</td>';
                html += '<td align="center" colspan="6">' + amtDue + '</td>';
                html += '<td align="center" colspan="6">' + payment + '</td>';
                html += '</tr>';



            }
        }


        html += '<tr>';
        html += '<td colspan="12" align="left" style="font-size:12px;padding-top:-10px;"><b><u><br/><br/>TDS Amount:</u>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;' + totalamt + '</b></td>';
        html += '<td align="right" colspan="23" style="font-size:12px;padding-top:20px;"><b>Total(in figure)</b>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;' + amountTotal + '</td>';
        html += '<td></td>';
        html += '</tr>';
        html += '<tr>';

        html += '</tr>';
        html += '<tr>';
        html += '<td colspan="12" align="left" style="font-size:12px"><b><u>Summary of IGST:</u>&nbsp;&nbsp;' + igst + '</b></td>';
        html += '</tr>';

        html += '</table>';
        html += '<hr />';



        html += '<table  style=" page-break-inside: avoid;"><tr>'; //page-break-inside: avoid;

        html += '	</tr>';

        html += '	<tr style="">';
        html += '	<th align="left" colspan="15">&nbsp;</th>';
        html += '</tr>';
        html += '	<tr>';
        html += '	<td align="center" colspan="12"><span style="font-size: 20px; font-weight: bold;"><!-- Thanks --></span></td>';
        html += '	</tr>';
        html += '	<tr>';
        html += '	<td colspan="12"><span style="width : 10% ;float:left;"><b>CIN : </b></span><span align="right">' + cin + '</span><br /><b>PAN : </b> <span align="right">' + pan + '</span></td>';
        html += '</tr></table>';



        html += '</body>';
        html += '</pdf>';


        var file = nlapiXMLToPDF(html);
        response.setContentType('PDF', 'Print.pdf ', 'inline');
        response.write(file.getValue());
    }




}