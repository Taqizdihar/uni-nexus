// Regenerate only after reviewing a fresh, read-only schema export. This never writes to MySQL.
import { readFileSync, writeFileSync } from 'node:fs';
const rows = (file) => readFileSync(file,'utf8').replace(/^\uFEFF/,'').trim().split(/\r?\n/).slice(1).map(line=>line.split('\t'));
const columns = rows('docs/schema-columns.tsv');
const foreignKeys = rows('docs/schema-relations.tsv');
const configs = [
 ['customers','Customers','Customer','Customer contacts, notes, and relationships. Customers are a shared company directory.','Sales','sales',['full_name','email','phone','is_active']],
 ['product_categories','Categories','Category','Organize the product library.','Catalog','sales',['name','slug','is_active']],
 ['products','Products','Product','Manage your reusable designs and catalog, from internal draft to publication.','Catalog','sales',['name','product_code','status','catalog_visibility','base_price']],
 ['product_variants','Variants','Variant','Material, color, size, and pricing options for a product.','Catalog','sales',['name','variant_code','price','is_active']],
 ['product_images','Product images','Product image','Catalog photography, previews, and image descriptions.','Catalog','sales',['file_name','alt_text','is_primary']],
 ['product_assets','Product assets','Product asset','Private model files, design versions, and external model references.','Catalog','design',['file_name','asset_type','version_label','is_internal_only']],
 ['product_sales_channels','Sales channels','Sales channel','Maintain marketplace listing links. Synchronization is not enabled.','Catalog','sales',['channel_name','listing_url','is_active']],
 ['custom_requests','Custom requests','Custom request','Capture requirements and guide each custom job through feasibility and estimation.','Sales','sales',['request_number','title','customer_id','status','target_date']],
 ['request_files','Reference files','Reference file','Attach reference photos, documents, and supporting files to requests.','Design','design',['file_name','file_type','created_at']],
 ['request_notes','Request notes','Request note','Record customer context and internal production guidance.','Design','design',['note','is_internal','created_at']],
 ['design_tasks','Design tasks','Design task','Assign design work, track reviews, and record delivery dates.','Design','design',['custom_request_id','assigned_to_user_id','status','priority']],
 ['design_assets','Design assets','Design asset','Version your models, identify final designs, and reuse approved work.','Design','design',['file_name','asset_type','version_label','is_final']],
 ['pricing_rules','Pricing rules','Pricing rule','Configure weight-based rates, minimum prices, and design or finishing fees.','Finance','finance',['name','rule_type','price_per_gram','minimum_price','is_active']],
 ['quotations','Quotations','Quotation','Build itemized estimates and preserve quotation revisions.','Sales','sales',['quotation_number','revision_no','customer_id','status','total_price']],
 ['quotation_items','Quotation items','Quotation item','Itemized quantities and rates; amounts are calculated on the server.','Sales','sales',['description','quantity','unit_price','amount']],
 ['orders','Orders','Order','Track confirmed customer orders, payments, and delivery targets.','Sales','sales',['order_number','customer_id','status','payment_status','total_price']],
 ['order_items','Order items','Order item','Products and custom designs included in an order.','Sales','sales',['item_name','quantity','unit_price','total_price']],
 ['production_jobs','Production','Production job','Plan the work for each order item and assign an operator.','Production','production',['job_number','order_item_id','assigned_operator_id','status','priority']],
 ['printers','Printers','Printer','Monitor your printer fleet and maintain machine details. Status is managed manually.','Production','production',['name','brand','model','status','location']],
 ['print_profiles','Print profiles','Print profile','Store practical slicer settings for repeatable printing.','Production','production',['name','printer_id','material_id','layer_height_mm','is_active']],
 ['slicing_results','Slicing results','Slicing result','Record model weight, support consumption, dimensions, and estimated print time.','Production','production',['production_job_id','slicer_name','model_weight_gram','total_weight_gram','estimated_print_minutes']],
 ['materials','Materials','Material','Manage material specifications and manufacturers.','Inventory','production',['name','material_type','manufacturer','is_active']],
 ['filament_spools','Filament inventory','Filament spool','Track spool stock in grams and purchase cost. Adjustments are audited.','Inventory','production',['spool_code','material_id','color_name','remaining_weight_gram','status']],
 ['material_usages','Material usage','Material usage','Record real consumption or waste against a print attempt; stock is deducted atomically.','Inventory','production',['print_job_id','filament_spool_id','usage_type','weight_gram','total_cost']],
 ['print_jobs','Print queue','Print job','Track individual print attempts, including retries and failed runs.','Production','production',['print_job_number','production_job_id','printer_id','status','estimated_print_minutes']],
 ['print_failures','Failures & waste','Print failure','Capture failed prints, wasted filament, root causes, and corrective action.','Quality','production',['print_job_id','failure_type','wasted_weight_gram','created_at']],
 ['experiments','Experiments','Experiment','Preserve the findings from material and print-setting experiments.','Quality','production',['experiment_number','title','result_status','performed_at']],
 ['experiment_measurements','Measurements','Measurement','Record experimental parameters and results with explicit units.','Quality','production',['parameter_name','parameter_value','unit']],
 ['cost_components','Cost components','Cost component','Define materials, machine time, electricity, design, waste, and packaging costs.','Finance','finance',['name','category','calculation_type','default_unit_cost','is_active']],
 ['production_costs','Costing & HPP','Production cost','Itemize estimated and actual costs. HPP is derived from these components.','Finance','finance',['description','cost_type','quantity','unit_cost','total_cost']],
 ['qc_inspections','Quality control','QC inspection','Inspect completed prints and record pass, rework, or reprint decisions.','Quality','production',['production_job_id','print_job_id','result','inspected_at']],
 ['qc_check_items','QC checklist','QC check','Record dimensions, surface quality, color, assembly, and completeness.','Quality','production',['check_name','result','notes']],
 ['packaging_types','Packaging types','Packaging type','Maintain packing materials and standard costs.','Quality','production',['name','default_cost','is_active']],
 ['order_packaging','Packaging','Order packaging','Record packing work and actual costs for each order.','Quality','production',['order_id','packaging_type_id','quantity','actual_cost','status']],
 ['ip_reviews','IP & license reviews','IP review','Document human review of design ownership and commercial-use concerns.','Quality','design',['custom_request_id','order_id','status','reviewed_at']],
 ['ip_review_checklists','IP checklist','IP check','Record the checks supporting a design license review.','Quality','design',['check_type','result','notes']],
 ['notification_settings','Notification settings','Notification setting','Configure event channels. Only in-app delivery is enabled in this foundation.','Settings','settings',['event_key','channel','is_enabled']],
 ['notifications','Notifications','Notification','Updates for your work in this workspace.','Workspace','read',['title','message','read_at','created_at']],
 ['audit_logs','Audit log','Audit entry','A history of important changes made in this workspace.','Workspace','audit',['action','entity_type','entity_id','user_id','created_at']],
 ['workspace_settings','Workspace settings','Workspace setting','Store general workspace preferences as named values.','Settings','settings',['setting_key','setting_value']],
];
const keyOf = t => t.replaceAll('_','-');
const allowedTables = new Set(configs.map(c=>c[0]));
const hidden = new Set(['id','workspace_id','object_key','bucket_name','storage_provider','password_hash','customer_account_id','uploaded_by_customer_account_id','mime_type','file_size_bytes','created_by_user_id','uploaded_by_user_id','recorded_by_user_id','reported_by_user_id']);
const readOnly = new Set(['created_at','updated_at','approved_by_user_id','sent_at','accepted_at','declined_at','published_at']);
const derived = {quotations:['subtotal','total_price'],orders:['subtotal','total_price'],quotation_items:['amount'],order_items:['total_price'],production_costs:['total_cost'],material_usages:['cost_per_gram','total_cost'],slicing_results:['total_weight_gram'],filament_spools:['cost_per_gram']};
const statuses = {
 custom_requests:['NEW','UNDER_REVIEW','NEED_INFORMATION','FEASIBLE','NOT_FEASIBLE','ESTIMATING','QUOTED','ACCEPTED','DECLINED','CANCELLED'],
 products:['DRAFT','ACTIVE','ARCHIVED'], design_tasks:['PENDING','IN_PROGRESS','REVIEW','COMPLETED','CANCELLED'],
 quotations:['DRAFT','APPROVED','SENT','ACCEPTED','DECLINED','EXPIRED'],
 orders:['CONFIRMED','IN_PRODUCTION','ON_HOLD','QC','PACKAGING','READY','COMPLETED','CANCELLED'],
 production_jobs:['WAITING','QUEUED','IN_PROGRESS','PRINTING','QC','PACKAGING','COMPLETED','ON_HOLD','CANCELLED'],
 printers:['IDLE','QUEUED','PRINTING','MAINTENANCE','OFFLINE','ERROR'],print_jobs:['QUEUED','PRINTING','PAUSED','SUCCESS','FAILED','CANCELLED'],
 filament_spools:['AVAILABLE','IN_USE','LOW','EMPTY','ARCHIVED'],order_packaging:['PENDING','PACKING','PACKED','CANCELLED'],ip_reviews:['NEEDS_REVIEW','CLEAR','RESTRICTED']
};
const sources = ['CUSTOMER_APP','WHATSAPP','SHOPEE','TOKOPEDIA','TIKTOK_SHOP','SHOPIFY','OFFLINE','OTHER'];
const options = {
 source:sources,order_source:sources,priority:['LOW','NORMAL','HIGH','URGENT'],
 catalog_visibility:['INTERNAL','PUBLIC','UNLISTED'],product_type:['READY_MODEL','CUSTOM','SERVICE'],
 payment_status:['UNPAID','PARTIAL','PAID','REFUNDED'],cost_type:['ESTIMATED','ACTUAL'],
 channel_name:['SHOPEE','TOKOPEDIA','TIKTOK_SHOP','SHOPIFY','OTHER'],
 asset_type:['STL','3MF','OBJ','BLEND','GCODE','RENDER','PREVIEW','OTHER'],
 file_type:['REFERENCE_IMAGE','DOCUMENT','MODEL','OTHER'],
 failure_type:['BED_ADHESION','LAYER_SHIFT','STRINGING','CLOGGING','WARPING','SUPPORT_FAILURE','POWER_FAILURE','OTHER'],
 usage_type:['MODEL','SUPPORT','WASTE','PURGE','OTHER'], channel:['IN_APP','EMAIL','WHATSAPP'],
 rule_type:['PER_GRAM','FIXED','CUSTOM'],calculation_type:['MANUAL','PER_GRAM','PER_HOUR','PER_UNIT'],
};
const nice = name=>name.replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase()).replace(/ Id$/,'').replace(/Gram/g,'(g)').replace(/Mm/g,'(mm)').replace(/Json/g,'JSON');
const resources = configs.map(([table,title,singular,description,group,permission,tableColumns])=>{
 const fields=columns.filter(r=>r[0]===table&&!hidden.has(r[1])).map(([,name,sql,nullable,def])=>{
  const fk=foreignKeys.find(r=>r[0]===table&&r[1]===name);
  const field={name,label:nice(name),type:'text',required:nullable==='NO'&&def==='NULL',nullable:nullable==='YES'};
  if (sql==='tinyint(1)') field.type='boolean';
  else if(sql.startsWith('decimal')) {field.type='decimal'; [field.precision,field.scale]=sql.match(/\d+/g).map(Number);}
  else if(sql.includes('int')) field.type='integer';
  else if(sql==='date') field.type='date';
  else if(sql.startsWith('datetime')) field.type='datetime';
  else if(sql==='json') field.type='json';
  else if(sql.includes('text')) field.type='textarea';
  if(sql.startsWith('varchar')||sql.startsWith('char')) field.maxLength=Number(sql.match(/\d+/)[0]);
  if(def!=='NULL'&&def!=='CURRENT_TIMESTAMP') field.default=field.type==='boolean'?def==='1':def;
  if(fk){field.type='relation';field.reference=keyOf(fk[2]);}
  const opts=name==='status'?statuses[table]:name==='result'&&table==='qc_inspections'?['PASS','FAIL','REWORK','REPRINT']:options[name];
  if(opts){field.type='select';field.options=opts;}
  if(readOnly.has(name)||derived[table]?.includes(name)||table==='audit_logs'||table==='notifications'||(table==='request_notes'&&name==='user_id'))field.readOnly=true;
  return field;
 });
 const allNames=columns.filter(c=>c[0]===table).map(c=>c[1]);
 const relations=foreignKeys.filter(r=>r[2]===table&&allowedTables.has(r[0])&&!['audit_logs'].includes(r[0])).map(r=>({resource:keyOf(r[0]),foreignKey:r[1],label:configs.find(c=>c[0]===r[0])[1]}));
 return {key:keyOf(table),table,title,singular,description,group,permission,fields,columns:tableColumns.filter(c=>allNames.includes(c)),search:fields.filter(f=>['text','textarea'].includes(f.type)&&!f.readOnly).map(f=>f.name),...(table==='audit_logs'||table==='notifications'?{readOnly:true}:{}),...(relations.length?{relations}: {})};
});
writeFileSync('packages/shared/src/resources.ts',`// Generated from the existing MySQL schema by scripts/generate-resources.mjs.\nimport type {ResourceDefinition} from './types.js';\nexport const resources: ResourceDefinition[] = ${JSON.stringify(resources,null,2)};\n`);
console.log(`Generated ${resources.length} schema-aligned resource definitions.`);
