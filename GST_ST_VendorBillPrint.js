/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */
define(['N/email', 'N/error', 'N/https', 'N/record', 'N/search', 'N/ui/serverWidget', 'N/url', 'N/xml', 'N/plugin'],
    /**
     * @param {email} email
     * @param {error} error
     * @param {https} https
     * @param {record} record
     * @param {search} search
     * @param {serverWidget} serverWidget
     * @param {url} url
     * @param {xml} xml
     */
    function(email, error, https, record, search, serverWidget, url, xml, plugin) {

        /**
         * Definition of the Suitelet script trigger point.
         *
         * @param {Object} context
         * @param {ServerRequest} context.request - Encapsulation of the incoming request
         * @param {ServerResponse} context.response - Encapsulation of the Suitelet response
         * @Since 2015.2
         */
        function onRequest(context) {

            /*var impls = plugin.findImplementations({
            type: 'customscript_gst_cp_library'
        });
        for (i = 0; i < impls.length; i++) {
            var pl = plugin.loadImplementation({
                type: 'customscript_gst_cp_library',
                implementation: impls[i]
            });
            log.debug('impl ' + impls[i] + ' result = ' +  pl.doTheMagic({
                operand1: 10,
                operand2: 20
            }));
        }
        var pl = plugin.loadImplementation({
            type: 'customscript_gst_cp_library'
        });
        log.debug('default impl result = ' + pl.doTheMagic(10, 20));*/

            var pl = plugin.loadImplementation({
                type: 'customscript_gst_cp_library'
            });
            log.debug('impl not specified, result = ' + pl.doTheMagic(10, 20));

            /*		var RecId = context.request.parameters['recId'];
		var RecType = context.request.parameters['recType'];
		log.debug("RecId: " + RecId);

		var LoadRec = record.load({
		    type: RecType, 
		    id: RecId,
		    isDynamic: false,
		});//nlapiLoadRecord(RecType,RecId);
		var TranId = LoadRec.getValue({fieldId: 'tranid'});//LoadRec.getFieldValue('tranid');
		var TranDate = LoadRec.getValue({fieldId: 'trandate'});//LoadRec.getFieldValue('trandate');
		var currency = LoadRec.getText({fieldId: 'currency'});//LoadRec.getFieldText('currency');
		var PaymentofTerms = LoadRec.getText({fieldId: 'terms'});//LoadRec.getFieldText('terms');
		var Sub = LoadRec.getValue({fieldId: 'subsidiary'});//LoadRec.getFieldValue('subsidiary');
		log.debug("Sub: " + Sub);

		var SubLookup = search.lookupFields({
		    type: search.Type.SUBSIDIARY,
		    id: Sub,
		    columns: ['legalname','email','url']//,'custrecordcustrecordphone'// not in use
		});

		//var SubLookup = nlapiLookupField('subsidiary',Sub,['legalname','email','custrecordcustrecordphone','url']);
		var SubName = SubLookup.legalname;
		var SubEmail = SubLookup.email;
		log.debug("SubEmail: " + SubEmail);

		//var SubPhone = SubLookup.custrecordcustrecordphone;//not used
		var url = SubLookup.url;

		var BillAdress = LoadRec.getValue({fieldId: 'billaddress'});//LoadRec.getFieldValue('billaddress');
		var DestState = LoadRec.getValue({fieldId: 'custbody_gst_destinationstate'});//LoadRec.getFieldText('custbody_gst_destinationstate');

		var id = LoadRec.getValue({fieldId: 'entity'});//LoadRec.getFieldValue('entity');


		var LoadRecord = record.load({
		    type: record.Type.VENDOR,
		    id: 1503,//id,
		    isDynamic: false,
		});//nlapiLoadRecord('vendor',id);


		var count = LoadRecord.getLineCount({
		    sublistId: 'addressbook'
		});//LoadRecord.getLineItemCount('addressbook');
		log.debug("Count: " + count);


		var account = LoadRecord.getValue({fieldId: 'entityid'});//LoadRecord.getFieldValue('entityid');
		for(var i=0;i<count;i++)
		{
			var defaultBilling = LoadRecord.getSublistValue({
			    sublistId: 'addressbook',
			    fieldId: 'defaultbilling',
			    line: i
			});//var defaultBilling = LoadRecord.getLineItemValue('addressbook','defaultbilling',i);
			log.debug('defaultBilling  '+defaultBilling);

			if(defaultBilling == true)
			{

				var hasSubrecord = LoadRecord.hasSublistSubrecord({
				    sublistId: 'addressbook',
				    fieldId: 'addressbookaddress',
				    line: i
				});
				if(hasSubrecord == true){

					var subrecord = LoadRecord.getSublistSubrecord({
						sublistId: 'addressbook',
					    fieldId: 'addressbookaddress',
					    line: i
					});//var subrecord = LoadRecord.viewLineItemSubrecord('addressbook','addressbookaddress',i); 
					log.debug('subrecord  '+subrecord);

					var addresstext = subrecord.getValue({fieldId: 'custrecord_gst_state_code'});//subrecord.getFieldValue('custrecord_gst_state_code'); 
					log.debug('addresstext  '+addresstext);

					break;
				}

			}
		}

    */
        }

        return {
            onRequest: onRequest
        };

    });