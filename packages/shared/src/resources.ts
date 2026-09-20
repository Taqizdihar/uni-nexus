// Generated from the existing MySQL schema by scripts/generate-resources.mjs.
import type {ResourceDefinition} from './types.js';
export const resources: ResourceDefinition[] = [
  {
    "key": "customers",
    "table": "customers",
    "title": "Customers",
    "singular": "Customer",
    "description": "Customer contacts, notes, and relationships. Customers are a shared company directory.",
    "group": "Sales",
    "permission": "sales",
    "fields": [
      {
        "name": "customer_code",
        "label": "Customer Code",
        "type": "text",
        "required": false,
        "nullable": true,
        "maxLength": 60
      },
      {
        "name": "full_name",
        "label": "Full Name",
        "type": "text",
        "required": true,
        "nullable": false,
        "maxLength": 150
      },
      {
        "name": "email",
        "label": "Email",
        "type": "text",
        "required": false,
        "nullable": true,
        "maxLength": 190
      },
      {
        "name": "phone",
        "label": "Phone",
        "type": "text",
        "required": false,
        "nullable": true,
        "maxLength": 30
      },
      {
        "name": "address_text",
        "label": "Address Text",
        "type": "textarea",
        "required": false,
        "nullable": true
      },
      {
        "name": "notes",
        "label": "Notes",
        "type": "textarea",
        "required": false,
        "nullable": true
      },
      {
        "name": "is_active",
        "label": "Is Active",
        "type": "boolean",
        "required": false,
        "nullable": false,
        "default": true
      },
      {
        "name": "created_at",
        "label": "Created At",
        "type": "datetime",
        "required": false,
        "nullable": false,
        "readOnly": true
      },
      {
        "name": "updated_at",
        "label": "Updated At",
        "type": "datetime",
        "required": false,
        "nullable": false,
        "readOnly": true
      }
    ],
    "columns": [
      "full_name",
      "email",
      "phone",
      "is_active"
    ],
    "search": [
      "customer_code",
      "full_name",
      "email",
      "phone",
      "address_text",
      "notes"
    ],
    "relations": [
      {
        "resource": "custom-requests",
        "foreignKey": "customer_id",
        "label": "Custom requests"
      },
      {
        "resource": "orders",
        "foreignKey": "customer_id",
        "label": "Orders"
      },
      {
        "resource": "quotations",
        "foreignKey": "customer_id",
        "label": "Quotations"
      }
    ]
  },
  {
    "key": "product-categories",
    "table": "product_categories",
    "title": "Categories",
    "singular": "Category",
    "description": "Organize the product library.",
    "group": "Catalog",
    "permission": "sales",
    "fields": [
      {
        "name": "parent_id",
        "label": "Parent",
        "type": "relation",
        "required": false,
        "nullable": true,
        "reference": "product-categories"
      },
      {
        "name": "name",
        "label": "Name",
        "type": "text",
        "required": true,
        "nullable": false,
        "maxLength": 120
      },
      {
        "name": "slug",
        "label": "Slug",
        "type": "text",
        "required": false,
        "nullable": true,
        "maxLength": 160
      },
      {
        "name": "description",
        "label": "Description",
        "type": "textarea",
        "required": false,
        "nullable": true
      },
      {
        "name": "is_active",
        "label": "Is Active",
        "type": "boolean",
        "required": false,
        "nullable": false,
        "default": true
      },
      {
        "name": "created_at",
        "label": "Created At",
        "type": "datetime",
        "required": false,
        "nullable": false,
        "readOnly": true
      },
      {
        "name": "updated_at",
        "label": "Updated At",
        "type": "datetime",
        "required": false,
        "nullable": false,
        "readOnly": true
      }
    ],
    "columns": [
      "name",
      "slug",
      "is_active"
    ],
    "search": [
      "name",
      "slug",
      "description"
    ],
    "relations": [
      {
        "resource": "product-categories",
        "foreignKey": "parent_id",
        "label": "Categories"
      },
      {
        "resource": "products",
        "foreignKey": "category_id",
        "label": "Products"
      }
    ]
  },
  {
    "key": "products",
    "table": "products",
    "title": "Products",
    "singular": "Product",
    "description": "Manage your reusable designs and catalog, from internal draft to publication.",
    "group": "Catalog",
    "permission": "sales",
    "fields": [
      {
        "name": "category_id",
        "label": "Category",
        "type": "relation",
        "required": false,
        "nullable": true,
        "reference": "product-categories"
      },
      {
        "name": "product_code",
        "label": "Product Code",
        "type": "text",
        "required": false,
        "nullable": true,
        "maxLength": 60
      },
      {
        "name": "name",
        "label": "Name",
        "type": "text",
        "required": true,
        "nullable": false,
        "maxLength": 180
      },
      {
        "name": "slug",
        "label": "Slug",
        "type": "text",
        "required": false,
        "nullable": true,
        "maxLength": 200
      },
      {
        "name": "product_type",
        "label": "Product Type",
        "type": "select",
        "required": false,
        "nullable": false,
        "maxLength": 50,
        "default": "READY_MODEL",
        "options": [
          "READY_MODEL",
          "CUSTOM",
          "SERVICE"
        ]
      },
      {
        "name": "short_description",
        "label": "Short Description",
        "type": "text",
        "required": false,
        "nullable": true,
        "maxLength": 500
      },
      {
        "name": "description",
        "label": "Description",
        "type": "textarea",
        "required": false,
        "nullable": true
      },
      {
        "name": "catalog_visibility",
        "label": "Catalog Visibility",
        "type": "select",
        "required": false,
        "nullable": false,
        "maxLength": 30,
        "default": "INTERNAL",
        "options": [
          "INTERNAL",
          "PUBLIC",
          "UNLISTED"
        ]
      },
      {
        "name": "status",
        "label": "Status",
        "type": "select",
        "required": false,
        "nullable": false,
        "maxLength": 30,
        "default": "DRAFT",
        "options": [
          "DRAFT",
          "ACTIVE",
          "ARCHIVED"
        ]
      },
      {
        "name": "base_price",
        "label": "Base Price",
        "type": "decimal",
        "required": false,
        "nullable": true,
        "precision": 14,
        "scale": 2
      },
      {
        "name": "currency_code",
        "label": "Currency Code",
        "type": "text",
        "required": false,
        "nullable": false,
        "maxLength": 3,
        "default": "IDR"
      },
      {
        "name": "default_material_id",
        "label": "Default Material",
        "type": "relation",
        "required": false,
        "nullable": true,
        "reference": "materials"
      },
      {
        "name": "default_weight_gram",
        "label": "Default Weight (g)",
        "type": "decimal",
        "required": false,
        "nullable": true,
        "precision": 12,
        "scale": 3
      },
      {
        "name": "is_active",
        "label": "Is Active",
        "type": "boolean",
        "required": false,
        "nullable": false,
        "default": true
      },
      {
        "name": "published_at",
        "label": "Published At",
        "type": "datetime",
        "required": false,
        "nullable": true,
        "readOnly": true
      },
      {
        "name": "created_at",
        "label": "Created At",
        "type": "datetime",
        "required": false,
        "nullable": false,
        "readOnly": true
      },
      {
        "name": "updated_at",
        "label": "Updated At",
        "type": "datetime",
        "required": false,
        "nullable": false,
        "readOnly": true
      }
    ],
    "columns": [
      "name",
      "product_code",
      "status",
      "catalog_visibility",
      "base_price"
    ],
    "search": [
      "product_code",
      "name",
      "slug",
      "short_description",
      "description",
      "currency_code"
    ],
    "relations": [
      {
        "resource": "custom-requests",
        "foreignKey": "existing_product_id",
        "label": "Custom requests"
      },
      {
        "resource": "order-items",
        "foreignKey": "product_id",
        "label": "Order items"
      },
      {
        "resource": "pricing-rules",
        "foreignKey": "product_id",
        "label": "Pricing rules"
      },
      {
        "resource": "product-assets",
        "foreignKey": "product_id",
        "label": "Product assets"
      },
      {
        "resource": "product-images",
        "foreignKey": "product_id",
        "label": "Product images"
      },
      {
        "resource": "product-sales-channels",
        "foreignKey": "product_id",
        "label": "Sales channels"
      },
      {
        "resource": "product-variants",
        "foreignKey": "product_id",
        "label": "Variants"
      },
      {
        "resource": "quotation-items",
        "foreignKey": "product_id",
        "label": "Quotation items"
      }
    ]
  },
  {
    "key": "product-variants",
    "table": "product_variants",
    "title": "Variants",
    "singular": "Variant",
    "description": "Material, color, size, and pricing options for a product.",
    "group": "Catalog",
    "permission": "sales",
    "fields": [
      {
        "name": "product_id",
        "label": "Product",
        "type": "relation",
        "required": true,
        "nullable": false,
        "reference": "products"
      },
      {
        "name": "variant_code",
        "label": "Variant Code",
        "type": "text",
        "required": false,
        "nullable": true,
        "maxLength": 80
      },
      {
        "name": "name",
        "label": "Name",
        "type": "text",
        "required": true,
        "nullable": false,
        "maxLength": 150
      },
      {
        "name": "material_id",
        "label": "Material",
        "type": "relation",
        "required": false,
        "nullable": true,
        "reference": "materials"
      },
      {
        "name": "color_name",
        "label": "Color Name",
        "type": "text",
        "required": false,
        "nullable": true,
        "maxLength": 100
      },
      {
        "name": "size_x_mm",
        "label": "Size X (mm)",
        "type": "decimal",
        "required": false,
        "nullable": true,
        "precision": 10,
        "scale": 2
      },
      {
        "name": "size_y_mm",
        "label": "Size Y (mm)",
        "type": "decimal",
        "required": false,
        "nullable": true,
        "precision": 10,
        "scale": 2
      },
      {
        "name": "size_z_mm",
        "label": "Size Z (mm)",
        "type": "decimal",
        "required": false,
        "nullable": true,
        "precision": 10,
        "scale": 2
      },
      {
        "name": "estimated_weight_gram",
        "label": "Estimated Weight (g)",
        "type": "decimal",
        "required": false,
        "nullable": true,
        "precision": 12,
        "scale": 3
      },
      {
        "name": "price",
        "label": "Price",
        "type": "decimal",
        "required": false,
        "nullable": true,
        "precision": 14,
        "scale": 2
      },
      {
        "name": "is_active",
        "label": "Is Active",
        "type": "boolean",
        "required": false,
        "nullable": false,
        "default": true
      },
      {
        "name": "created_at",
        "label": "Created At",
        "type": "datetime",
        "required": false,
        "nullable": false,
        "readOnly": true
      },
      {
        "name": "updated_at",
        "label": "Updated At",
        "type": "datetime",
        "required": false,
        "nullable": false,
        "readOnly": true
      }
    ],
    "columns": [
      "name",
      "variant_code",
      "price",
      "is_active"
    ],
    "search": [
      "variant_code",
      "name",
      "color_name"
    ],
    "relations": [
      {
        "resource": "order-items",
        "foreignKey": "product_variant_id",
        "label": "Order items"
      },
      {
        "resource": "quotation-items",
        "foreignKey": "product_variant_id",
        "label": "Quotation items"
      }
    ]
  },
  {
    "key": "product-images",
    "table": "product_images",
    "title": "Product images",
    "singular": "Product image",
    "description": "Catalog photography, previews, and image descriptions.",
    "group": "Catalog",
    "permission": "sales",
    "fields": [
      {
        "name": "product_id",
        "label": "Product",
        "type": "relation",
        "required": true,
        "nullable": false,
        "reference": "products"
      },
      {
        "name": "file_name",
        "label": "File Name",
        "type": "text",
        "required": true,
        "nullable": false,
        "maxLength": 255
      },
      {
        "name": "public_url",
        "label": "Public Url",
        "type": "textarea",
        "required": false,
        "nullable": true
      },
      {
        "name": "alt_text",
        "label": "Alt Text",
        "type": "text",
        "required": false,
        "nullable": true,
        "maxLength": 255
      },
      {
        "name": "sort_order",
        "label": "Sort Order",
        "type": "integer",
        "required": false,
        "nullable": false,
        "default": "0"
      },
      {
        "name": "is_primary",
        "label": "Is Primary",
        "type": "boolean",
        "required": false,
        "nullable": false,
        "default": false
      },
      {
        "name": "created_at",
        "label": "Created At",
        "type": "datetime",
        "required": false,
        "nullable": false,
        "readOnly": true
      }
    ],
    "columns": [
      "file_name",
      "alt_text",
      "is_primary"
    ],
    "search": [
      "file_name",
      "public_url",
      "alt_text"
    ]
  },
  {
    "key": "product-assets",
    "table": "product_assets",
    "title": "Product assets",
    "singular": "Product asset",
    "description": "Private model files, design versions, and external model references.",
    "group": "Catalog",
    "permission": "design",
    "fields": [
      {
        "name": "product_id",
        "label": "Product",
        "type": "relation",
        "required": true,
        "nullable": false,
        "reference": "products"
      },
      {
        "name": "source_design_asset_id",
        "label": "Source Design Asset",
        "type": "relation",
        "required": false,
        "nullable": true,
        "reference": "design-assets"
      },
      {
        "name": "asset_type",
        "label": "Asset Type",
        "type": "select",
        "required": true,
        "nullable": false,
        "maxLength": 50,
        "options": [
          "STL",
          "3MF",
          "OBJ",
          "BLEND",
          "GCODE",
          "RENDER",
          "PREVIEW",
          "OTHER"
        ]
      },
      {
        "name": "file_name",
        "label": "File Name",
        "type": "text",
        "required": false,
        "nullable": true,
        "maxLength": 255
      },
      {
        "name": "external_url",
        "label": "External Url",
        "type": "textarea",
        "required": false,
        "nullable": true
      },
      {
        "name": "version_label",
        "label": "Version Label",
        "type": "text",
        "required": false,
        "nullable": true,
        "maxLength": 60
      },
      {
        "name": "is_primary",
        "label": "Is Primary",
        "type": "boolean",
        "required": false,
        "nullable": false,
        "default": false
      },
      {
        "name": "is_internal_only",
        "label": "Is Internal Only",
        "type": "boolean",
        "required": false,
        "nullable": false,
        "default": true
      },
      {
        "name": "notes",
        "label": "Notes",
        "type": "textarea",
        "required": false,
        "nullable": true
      },
      {
        "name": "created_at",
        "label": "Created At",
        "type": "datetime",
        "required": false,
        "nullable": false,
        "readOnly": true
      }
    ],
    "columns": [
      "file_name",
      "asset_type",
      "version_label",
      "is_internal_only"
    ],
    "search": [
      "file_name",
      "external_url",
      "version_label",
      "notes"
    ]
  },
  {
    "key": "product-sales-channels",
    "table": "product_sales_channels",
    "title": "Sales channels",
    "singular": "Sales channel",
    "description": "Maintain marketplace listing links. Synchronization is not enabled.",
    "group": "Catalog",
    "permission": "sales",
    "fields": [
      {
        "name": "product_id",
        "label": "Product",
        "type": "relation",
        "required": true,
        "nullable": false,
        "reference": "products"
      },
      {
        "name": "channel_name",
        "label": "Channel Name",
        "type": "select",
        "required": true,
        "nullable": false,
        "maxLength": 60,
        "options": [
          "SHOPEE",
          "TOKOPEDIA",
          "TIKTOK_SHOP",
          "SHOPIFY",
          "OTHER"
        ]
      },
      {
        "name": "external_product_id",
        "label": "External Product",
        "type": "text",
        "required": false,
        "nullable": true,
        "maxLength": 190
      },
      {
        "name": "listing_url",
        "label": "Listing Url",
        "type": "textarea",
        "required": false,
        "nullable": true
      },
      {
        "name": "is_active",
        "label": "Is Active",
        "type": "boolean",
        "required": false,
        "nullable": false,
        "default": true
      },
      {
        "name": "created_at",
        "label": "Created At",
        "type": "datetime",
        "required": false,
        "nullable": false,
        "readOnly": true
      },
      {
        "name": "updated_at",
        "label": "Updated At",
        "type": "datetime",
        "required": false,
        "nullable": false,
        "readOnly": true
      }
    ],
    "columns": [
      "channel_name",
      "listing_url",
      "is_active"
    ],
    "search": [
      "external_product_id",
      "listing_url"
    ]
  },
  {
    "key": "custom-requests",
    "table": "custom_requests",
    "title": "Custom requests",
    "singular": "Custom request",
    "description": "Capture requirements and guide each custom job through feasibility and estimation.",
    "group": "Sales",
    "permission": "sales",
    "fields": [
      {
        "name": "request_number",
        "label": "Request Number",
        "type": "text",
        "required": false,
        "nullable": true,
        "maxLength": 60
      },
      {
        "name": "customer_id",
        "label": "Customer",
        "type": "relation",
        "required": true,
        "nullable": false,
        "reference": "customers"
      },
      {
        "name": "source",
        "label": "Source",
        "type": "select",
        "required": false,
        "nullable": false,
        "maxLength": 60,
        "default": "CUSTOMER_APP",
        "options": [
          "CUSTOMER_APP",
          "WHATSAPP",
          "SHOPEE",
          "TOKOPEDIA",
          "TIKTOK_SHOP",
          "SHOPIFY",
          "OFFLINE",
          "OTHER"
        ]
      },
      {
        "name": "existing_product_id",
        "label": "Existing Product",
        "type": "relation",
        "required": false,
        "nullable": true,
        "reference": "products"
      },
      {
        "name": "title",
        "label": "Title",
        "type": "text",
        "required": false,
        "nullable": true,
        "maxLength": 180
      },
      {
        "name": "description",
        "label": "Description",
        "type": "textarea",
        "required": false,
        "nullable": true
      },
      {
        "name": "requested_quantity",
        "label": "Requested Quantity",
        "type": "integer",
        "required": false,
        "nullable": false,
        "default": "1"
      },
      {
        "name": "requested_height_mm",
        "label": "Requested Height (mm)",
        "type": "decimal",
        "required": false,
        "nullable": true,
        "precision": 10,
        "scale": 2
      },
      {
        "name": "requested_width_mm",
        "label": "Requested Width (mm)",
        "type": "decimal",
        "required": false,
        "nullable": true,
        "precision": 10,
        "scale": 2
      },
      {
        "name": "requested_length_mm",
        "label": "Requested Length (mm)",
        "type": "decimal",
        "required": false,
        "nullable": true,
        "precision": 10,
        "scale": 2
      },
      {
        "name": "preferred_material_id",
        "label": "Preferred Material",
        "type": "relation",
        "required": false,
        "nullable": true,
        "reference": "materials"
      },
      {
        "name": "preferred_color",
        "label": "Preferred Color",
        "type": "text",
        "required": false,
        "nullable": true,
        "maxLength": 100
      },
      {
        "name": "target_date",
        "label": "Target Date",
        "type": "date",
        "required": false,
        "nullable": true
      },
      {
        "name": "status",
        "label": "Status",
        "type": "select",
        "required": false,
        "nullable": false,
        "maxLength": 40,
        "default": "NEW",
        "options": [
          "NEW",
          "UNDER_REVIEW",
          "NEED_INFORMATION",
          "FEASIBLE",
          "NOT_FEASIBLE",
          "ESTIMATING",
          "QUOTED",
          "ACCEPTED",
          "DECLINED",
          "CANCELLED"
        ]
      },
      {
        "name": "assigned_designer_id",
        "label": "Assigned Designer",
        "type": "relation",
        "required": false,
        "nullable": true,
        "reference": "users"
      },
      {
        "name": "created_at",
        "label": "Created At",
        "type": "datetime",
        "required": false,
        "nullable": false,
        "readOnly": true
      },
      {
        "name": "updated_at",
        "label": "Updated At",
        "type": "datetime",
        "required": false,
        "nullable": false,
        "readOnly": true
      }
    ],
    "columns": [
      "request_number",
      "title",
      "customer_id",
      "status",
      "target_date"
    ],
    "search": [
      "request_number",
      "title",
      "description",
      "preferred_color"
    ],
    "relations": [
      {
        "resource": "design-assets",
        "foreignKey": "custom_request_id",
        "label": "Design assets"
      },
      {
        "resource": "design-tasks",
        "foreignKey": "custom_request_id",
        "label": "Design tasks"
      },
      {
        "resource": "ip-reviews",
        "foreignKey": "custom_request_id",
        "label": "IP & license reviews"
      },
      {
        "resource": "orders",
        "foreignKey": "custom_request_id",
        "label": "Orders"
      },
      {
        "resource": "quotations",
        "foreignKey": "custom_request_id",
        "label": "Quotations"
      },
      {
        "resource": "request-files",
        "foreignKey": "custom_request_id",
        "label": "Reference files"
      },
      {
        "resource": "request-notes",
        "foreignKey": "custom_request_id",
        "label": "Request notes"
      }
    ]
  },
  {
    "key": "request-files",
    "table": "request_files",
    "title": "Reference files",
    "singular": "Reference file",
    "description": "Attach reference photos, documents, and supporting files to requests.",
    "group": "Design",
    "permission": "design",
    "fields": [
      {
        "name": "custom_request_id",
        "label": "Custom Request",
        "type": "relation",
        "required": true,
        "nullable": false,
        "reference": "custom-requests"
      },
      {
        "name": "file_type",
        "label": "File Type",
        "type": "select",
        "required": true,
        "nullable": false,
        "maxLength": 50,
        "options": [
          "REFERENCE_IMAGE",
          "DOCUMENT",
          "MODEL",
          "OTHER"
        ]
      },
      {
        "name": "file_name",
        "label": "File Name",
        "type": "text",
        "required": true,
        "nullable": false,
        "maxLength": 255
      },
      {
        "name": "created_at",
        "label": "Created At",
        "type": "datetime",
        "required": false,
        "nullable": false,
        "readOnly": true
      }
    ],
    "columns": [
      "file_name",
      "file_type",
      "created_at"
    ],
    "search": [
      "file_name"
    ]
  },
  {
    "key": "request-notes",
    "table": "request_notes",
    "title": "Request notes",
    "singular": "Request note",
    "description": "Record customer context and internal production guidance.",
    "group": "Design",
    "permission": "design",
    "fields": [
      {
        "name": "custom_request_id",
        "label": "Custom Request",
        "type": "relation",
        "required": true,
        "nullable": false,
        "reference": "custom-requests"
      },
      {
        "name": "user_id",
        "label": "User",
        "type": "relation",
        "required": false,
        "nullable": true,
        "reference": "users",
        "readOnly": true
      },
      {
        "name": "note",
        "label": "Note",
        "type": "textarea",
        "required": true,
        "nullable": false
      },
      {
        "name": "is_internal",
        "label": "Is Internal",
        "type": "boolean",
        "required": false,
        "nullable": false,
        "default": true
      },
      {
        "name": "created_at",
        "label": "Created At",
        "type": "datetime",
        "required": false,
        "nullable": false,
        "readOnly": true
      }
    ],
    "columns": [
      "note",
      "is_internal",
      "created_at"
    ],
    "search": [
      "note"
    ]
  },
  {
    "key": "design-tasks",
    "table": "design_tasks",
    "title": "Design tasks",
    "singular": "Design task",
    "description": "Assign design work, track reviews, and record delivery dates.",
    "group": "Design",
    "permission": "design",
    "fields": [
      {
        "name": "custom_request_id",
        "label": "Custom Request",
        "type": "relation",
        "required": true,
        "nullable": false,
        "reference": "custom-requests"
      },
      {
        "name": "assigned_to_user_id",
        "label": "Assigned To User",
        "type": "relation",
        "required": false,
        "nullable": true,
        "reference": "users"
      },
      {
        "name": "status",
        "label": "Status",
        "type": "select",
        "required": false,
        "nullable": false,
        "maxLength": 40,
        "default": "PENDING",
        "options": [
          "PENDING",
          "IN_PROGRESS",
          "REVIEW",
          "COMPLETED",
          "CANCELLED"
        ]
      },
      {
        "name": "priority",
        "label": "Priority",
        "type": "select",
        "required": false,
        "nullable": false,
        "maxLength": 20,
        "default": "NORMAL",
        "options": [
          "LOW",
          "NORMAL",
          "HIGH",
          "URGENT"
        ]
      },
      {
        "name": "started_at",
        "label": "Started At",
        "type": "datetime",
        "required": false,
        "nullable": true
      },
      {
        "name": "completed_at",
        "label": "Completed At",
        "type": "datetime",
        "required": false,
        "nullable": true
      },
      {
        "name": "notes",
        "label": "Notes",
        "type": "textarea",
        "required": false,
        "nullable": true
      },
      {
        "name": "created_at",
        "label": "Created At",
        "type": "datetime",
        "required": false,
        "nullable": false,
        "readOnly": true
      },
      {
        "name": "updated_at",
        "label": "Updated At",
        "type": "datetime",
        "required": false,
        "nullable": false,
        "readOnly": true
      }
    ],
    "columns": [
      "custom_request_id",
      "assigned_to_user_id",
      "status",
      "priority"
    ],
    "search": [
      "notes"
    ],
    "relations": [
      {
        "resource": "design-assets",
        "foreignKey": "design_task_id",
        "label": "Design assets"
      }
    ]
  },
  {
    "key": "design-assets",
    "table": "design_assets",
    "title": "Design assets",
    "singular": "Design asset",
    "description": "Version your models, identify final designs, and reuse approved work.",
    "group": "Design",
    "permission": "design",
    "fields": [
      {
        "name": "custom_request_id",
        "label": "Custom Request",
        "type": "relation",
        "required": false,
        "nullable": true,
        "reference": "custom-requests"
      },
      {
        "name": "design_task_id",
        "label": "Design Task",
        "type": "relation",
        "required": false,
        "nullable": true,
        "reference": "design-tasks"
      },
      {
        "name": "file_name",
        "label": "File Name",
        "type": "text",
        "required": true,
        "nullable": false,
        "maxLength": 255
      },
      {
        "name": "asset_type",
        "label": "Asset Type",
        "type": "select",
        "required": true,
        "nullable": false,
        "maxLength": 50,
        "options": [
          "STL",
          "3MF",
          "OBJ",
          "BLEND",
          "GCODE",
          "RENDER",
          "PREVIEW",
          "OTHER"
        ]
      },
      {
        "name": "external_url",
        "label": "External Url",
        "type": "textarea",
        "required": false,
        "nullable": true
      },
      {
        "name": "version_label",
        "label": "Version Label",
        "type": "text",
        "required": false,
        "nullable": true,
        "maxLength": 60
      },
      {
        "name": "is_final",
        "label": "Is Final",
        "type": "boolean",
        "required": false,
        "nullable": false,
        "default": false
      },
      {
        "name": "notes",
        "label": "Notes",
        "type": "textarea",
        "required": false,
        "nullable": true
      },
      {
        "name": "created_at",
        "label": "Created At",
        "type": "datetime",
        "required": false,
        "nullable": false,
        "readOnly": true
      }
    ],
    "columns": [
      "file_name",
      "asset_type",
      "version_label",
      "is_final"
    ],
    "search": [
      "file_name",
      "external_url",
      "version_label",
      "notes"
    ],
    "relations": [
      {
        "resource": "order-items",
        "foreignKey": "design_asset_id",
        "label": "Order items"
      },
      {
        "resource": "product-assets",
        "foreignKey": "source_design_asset_id",
        "label": "Product assets"
      },
      {
        "resource": "slicing-results",
        "foreignKey": "design_asset_id",
        "label": "Slicing results"
      }
    ]
  },
  {
    "key": "pricing-rules",
    "table": "pricing_rules",
    "title": "Pricing rules",
    "singular": "Pricing rule",
    "description": "Configure weight-based rates, minimum prices, and design or finishing fees.",
    "group": "Finance",
    "permission": "finance",
    "fields": [
      {
        "name": "name",
        "label": "Name",
        "type": "text",
        "required": true,
        "nullable": false,
        "maxLength": 150
      },
      {
        "name": "rule_type",
        "label": "Rule Type",
        "type": "select",
        "required": false,
        "nullable": false,
        "maxLength": 50,
        "default": "PER_GRAM",
        "options": [
          "PER_GRAM",
          "FIXED",
          "CUSTOM"
        ]
      },
      {
        "name": "material_id",
        "label": "Material",
        "type": "relation",
        "required": false,
        "nullable": true,
        "reference": "materials"
      },
      {
        "name": "product_id",
        "label": "Product",
        "type": "relation",
        "required": false,
        "nullable": true,
        "reference": "products"
      },
      {
        "name": "price_per_gram",
        "label": "Price Per (g)",
        "type": "decimal",
        "required": false,
        "nullable": true,
        "precision": 14,
        "scale": 4
      },
      {
        "name": "minimum_price",
        "label": "Minimum Price",
        "type": "decimal",
        "required": false,
        "nullable": true,
        "precision": 14,
        "scale": 2
      },
      {
        "name": "design_fee",
        "label": "Design Fee",
        "type": "decimal",
        "required": false,
        "nullable": false,
        "precision": 14,
        "scale": 2,
        "default": "0.00"
      },
      {
        "name": "finishing_fee",
        "label": "Finishing Fee",
        "type": "decimal",
        "required": false,
        "nullable": false,
        "precision": 14,
        "scale": 2,
        "default": "0.00"
      },
      {
        "name": "additional_config_json",
        "label": "Additional Config JSON",
        "type": "json",
        "required": false,
        "nullable": true
      },
      {
        "name": "effective_from",
        "label": "Effective From",
        "type": "datetime",
        "required": false,
        "nullable": true
      },
      {
        "name": "effective_until",
        "label": "Effective Until",
        "type": "datetime",
        "required": false,
        "nullable": true
      },
      {
        "name": "is_active",
        "label": "Is Active",
        "type": "boolean",
        "required": false,
        "nullable": false,
        "default": true
      },
      {
        "name": "created_at",
        "label": "Created At",
        "type": "datetime",
        "required": false,
        "nullable": false,
        "readOnly": true
      },
      {
        "name": "updated_at",
        "label": "Updated At",
        "type": "datetime",
        "required": false,
        "nullable": false,
        "readOnly": true
      }
    ],
    "columns": [
      "name",
      "rule_type",
      "price_per_gram",
      "minimum_price",
      "is_active"
    ],
    "search": [
      "name"
    ],
    "relations": [
      {
        "resource": "quotation-items",
        "foreignKey": "pricing_rule_id",
        "label": "Quotation items"
      }
    ]
  },
  {
    "key": "quotations",
    "table": "quotations",
    "title": "Quotations",
    "singular": "Quotation",
    "description": "Build itemized estimates and preserve quotation revisions.",
    "group": "Sales",
    "permission": "sales",
    "fields": [
      {
        "name": "quotation_number",
        "label": "Quotation Number",
        "type": "text",
        "required": false,
        "nullable": true,
        "maxLength": 60
      },
      {
        "name": "revision_no",
        "label": "Revision No",
        "type": "integer",
        "required": false,
        "nullable": false,
        "default": "1"
      },
      {
        "name": "custom_request_id",
        "label": "Custom Request",
        "type": "relation",
        "required": true,
        "nullable": false,
        "reference": "custom-requests"
      },
      {
        "name": "customer_id",
        "label": "Customer",
        "type": "relation",
        "required": true,
        "nullable": false,
        "reference": "customers"
      },
      {
        "name": "subtotal",
        "label": "Subtotal",
        "type": "decimal",
        "required": false,
        "nullable": false,
        "precision": 14,
        "scale": 2,
        "default": "0.00",
        "readOnly": true
      },
      {
        "name": "discount_amount",
        "label": "Discount Amount",
        "type": "decimal",
        "required": false,
        "nullable": false,
        "precision": 14,
        "scale": 2,
        "default": "0.00"
      },
      {
        "name": "additional_cost",
        "label": "Additional Cost",
        "type": "decimal",
        "required": false,
        "nullable": false,
        "precision": 14,
        "scale": 2,
        "default": "0.00"
      },
      {
        "name": "total_price",
        "label": "Total Price",
        "type": "decimal",
        "required": false,
        "nullable": false,
        "precision": 14,
        "scale": 2,
        "default": "0.00",
        "readOnly": true
      },
      {
        "name": "currency_code",
        "label": "Currency Code",
        "type": "text",
        "required": false,
        "nullable": false,
        "maxLength": 3,
        "default": "IDR"
      },
      {
        "name": "status",
        "label": "Status",
        "type": "select",
        "required": false,
        "nullable": false,
        "maxLength": 30,
        "default": "DRAFT",
        "options": [
          "DRAFT",
          "APPROVED",
          "SENT",
          "ACCEPTED",
          "DECLINED",
          "EXPIRED"
        ]
      },
      {
        "name": "valid_until",
        "label": "Valid Until",
        "type": "datetime",
        "required": false,
        "nullable": true
      },
      {
        "name": "approved_by_user_id",
        "label": "Approved By User",
        "type": "relation",
        "required": false,
        "nullable": true,
        "reference": "users",
        "readOnly": true
      },
      {
        "name": "sent_at",
        "label": "Sent At",
        "type": "datetime",
        "required": false,
        "nullable": true,
        "readOnly": true
      },
      {
        "name": "accepted_at",
        "label": "Accepted At",
        "type": "datetime",
        "required": false,
        "nullable": true,
        "readOnly": true
      },
      {
        "name": "declined_at",
        "label": "Declined At",
        "type": "datetime",
        "required": false,
        "nullable": true,
        "readOnly": true
      },
      {
        "name": "notes",
        "label": "Notes",
        "type": "textarea",
        "required": false,
        "nullable": true
      },
      {
        "name": "created_at",
        "label": "Created At",
        "type": "datetime",
        "required": false,
        "nullable": false,
        "readOnly": true
      },
      {
        "name": "updated_at",
        "label": "Updated At",
        "type": "datetime",
        "required": false,
        "nullable": false,
        "readOnly": true
      }
    ],
    "columns": [
      "quotation_number",
      "revision_no",
      "customer_id",
      "status",
      "total_price"
    ],
    "search": [
      "quotation_number",
      "currency_code",
      "notes"
    ],
    "relations": [
      {
        "resource": "orders",
        "foreignKey": "quotation_id",
        "label": "Orders"
      },
      {
        "resource": "quotation-items",
        "foreignKey": "quotation_id",
        "label": "Quotation items"
      }
    ]
  },
  {
    "key": "quotation-items",
    "table": "quotation_items",
    "title": "Quotation items",
    "singular": "Quotation item",
    "description": "Itemized quantities and rates; amounts are calculated on the server.",
    "group": "Sales",
    "permission": "sales",
    "fields": [
      {
        "name": "quotation_id",
        "label": "Quotation",
        "type": "relation",
        "required": true,
        "nullable": false,
        "reference": "quotations"
      },
      {
        "name": "product_id",
        "label": "Product",
        "type": "relation",
        "required": false,
        "nullable": true,
        "reference": "products"
      },
      {
        "name": "product_variant_id",
        "label": "Product Variant",
        "type": "relation",
        "required": false,
        "nullable": true,
        "reference": "product-variants"
      },
      {
        "name": "pricing_rule_id",
        "label": "Aturan Harga",
        "type": "relation",
        "required": false,
        "nullable": true,
        "reference": "pricing-rules"
      },
      {
        "name": "material_id",
        "label": "Material",
        "type": "relation",
        "required": false,
        "nullable": true,
        "reference": "materials"
      },
      {
        "name": "billable_weight_gram",
        "label": "Berat Ditagihkan (g)",
        "type": "decimal",
        "required": false,
        "nullable": true,
        "precision": 12,
        "scale": 3
      },
      {
        "name": "pricing_rule_name_snapshot",
        "label": "Aturan Harga (Snapshot)",
        "type": "text",
        "required": false,
        "nullable": true,
        "maxLength": 150,
        "readOnly": true
      },
      {
        "name": "pricing_rule_type_snapshot",
        "label": "Jenis Aturan (Snapshot)",
        "type": "text",
        "required": false,
        "nullable": true,
        "maxLength": 50,
        "readOnly": true
      },
      {
        "name": "price_per_gram_snapshot",
        "label": "Harga per Gram (Snapshot)",
        "type": "decimal",
        "required": false,
        "nullable": true,
        "precision": 14,
        "scale": 4,
        "readOnly": true
      },
      {
        "name": "minimum_price_snapshot",
        "label": "Harga Minimum (Snapshot)",
        "type": "decimal",
        "required": false,
        "nullable": true,
        "precision": 14,
        "scale": 2,
        "readOnly": true
      },
      {
        "name": "design_fee_snapshot",
        "label": "Biaya Desain (Snapshot)",
        "type": "decimal",
        "required": false,
        "nullable": true,
        "precision": 14,
        "scale": 2,
        "readOnly": true
      },
      {
        "name": "finishing_fee_snapshot",
        "label": "Biaya Finishing (Snapshot)",
        "type": "decimal",
        "required": false,
        "nullable": true,
        "precision": 14,
        "scale": 2,
        "readOnly": true
      },
      {
        "name": "pricing_breakdown_json",
        "label": "Rincian Harga",
        "type": "json",
        "required": false,
        "nullable": true,
        "readOnly": true
      },
      {
        "name": "pricing_calculated_at",
        "label": "Harga Dihitung Pada",
        "type": "datetime",
        "required": false,
        "nullable": true,
        "readOnly": true
      },
      {
        "name": "description",
        "label": "Description",
        "type": "text",
        "required": true,
        "nullable": false,
        "maxLength": 255
      },
      {
        "name": "quantity",
        "label": "Quantity",
        "type": "decimal",
        "required": false,
        "nullable": false,
        "precision": 12,
        "scale": 3,
        "default": "1.000"
      },
      {
        "name": "unit_price",
        "label": "Unit Price",
        "type": "decimal",
        "required": false,
        "nullable": false,
        "precision": 14,
        "scale": 2,
        "default": "0.00"
      },
      {
        "name": "amount",
        "label": "Amount",
        "type": "decimal",
        "required": false,
        "nullable": false,
        "precision": 14,
        "scale": 2,
        "default": "0.00",
        "readOnly": true
      },
      {
        "name": "created_at",
        "label": "Created At",
        "type": "datetime",
        "required": false,
        "nullable": false,
        "readOnly": true
      }
    ],
    "columns": [
      "description",
      "quantity",
      "unit_price",
      "amount"
    ],
    "search": [
      "description"
    ]
  },
  {
    "key": "orders",
    "table": "orders",
    "title": "Orders",
    "singular": "Order",
    "description": "Track confirmed customer orders, payments, and delivery targets.",
    "group": "Sales",
    "permission": "sales",
    "fields": [
      {
        "name": "order_number",
        "label": "Order Number",
        "type": "text",
        "required": false,
        "nullable": true,
        "maxLength": 60
      },
      {
        "name": "customer_id",
        "label": "Customer",
        "type": "relation",
        "required": true,
        "nullable": false,
        "reference": "customers"
      },
      {
        "name": "custom_request_id",
        "label": "Custom Request",
        "type": "relation",
        "required": false,
        "nullable": true,
        "reference": "custom-requests"
      },
      {
        "name": "quotation_id",
        "label": "Quotation",
        "type": "relation",
        "required": false,
        "nullable": true,
        "reference": "quotations"
      },
      {
        "name": "order_source",
        "label": "Order Source",
        "type": "select",
        "required": false,
        "nullable": false,
        "maxLength": 60,
        "default": "CUSTOMER_APP",
        "options": [
          "CUSTOMER_APP",
          "WHATSAPP",
          "SHOPEE",
          "TOKOPEDIA",
          "TIKTOK_SHOP",
          "SHOPIFY",
          "OFFLINE",
          "OTHER"
        ]
      },
      {
        "name": "status",
        "label": "Status",
        "type": "select",
        "required": false,
        "nullable": false,
        "maxLength": 40,
        "default": "CONFIRMED",
        "options": [
          "CONFIRMED",
          "IN_PRODUCTION",
          "ON_HOLD",
          "QC",
          "PACKAGING",
          "READY",
          "COMPLETED",
          "CANCELLED"
        ]
      },
      {
        "name": "payment_status",
        "label": "Payment Status",
        "type": "select",
        "required": false,
        "nullable": false,
        "maxLength": 30,
        "default": "UNPAID",
        "options": [
          "UNPAID",
          "PARTIAL",
          "PAID",
          "REFUNDED"
        ]
      },
      {
        "name": "shipping_status",
        "label": "Shipping Status",
        "type": "text",
        "required": false,
        "nullable": true,
        "maxLength": 30
      },
      {
        "name": "order_date",
        "label": "Order Date",
        "type": "datetime",
        "required": false,
        "nullable": false
      },
      {
        "name": "target_date",
        "label": "Target Date",
        "type": "date",
        "required": false,
        "nullable": true
      },
      {
        "name": "subtotal",
        "label": "Subtotal",
        "type": "decimal",
        "required": false,
        "nullable": false,
        "precision": 14,
        "scale": 2,
        "default": "0.00",
        "readOnly": true
      },
      {
        "name": "discount_amount",
        "label": "Discount Amount",
        "type": "decimal",
        "required": false,
        "nullable": false,
        "precision": 14,
        "scale": 2,
        "default": "0.00"
      },
      {
        "name": "total_price",
        "label": "Total Price",
        "type": "decimal",
        "required": false,
        "nullable": false,
        "precision": 14,
        "scale": 2,
        "default": "0.00",
        "readOnly": true
      },
      {
        "name": "currency_code",
        "label": "Currency Code",
        "type": "text",
        "required": false,
        "nullable": false,
        "maxLength": 3,
        "default": "IDR"
      },
      {
        "name": "shipping_name",
        "label": "Shipping Name",
        "type": "text",
        "required": false,
        "nullable": true,
        "maxLength": 150
      },
      {
        "name": "shipping_phone",
        "label": "Shipping Phone",
        "type": "text",
        "required": false,
        "nullable": true,
        "maxLength": 30
      },
      {
        "name": "shipping_address",
        "label": "Shipping Address",
        "type": "textarea",
        "required": false,
        "nullable": true
      },
      {
        "name": "customer_notes",
        "label": "Customer Notes",
        "type": "textarea",
        "required": false,
        "nullable": true
      },
      {
        "name": "internal_notes",
        "label": "Internal Notes",
        "type": "textarea",
        "required": false,
        "nullable": true
      },
      {
        "name": "completed_at",
        "label": "Completed At",
        "type": "datetime",
        "required": false,
        "nullable": true
      },
      {
        "name": "created_at",
        "label": "Created At",
        "type": "datetime",
        "required": false,
        "nullable": false,
        "readOnly": true
      },
      {
        "name": "updated_at",
        "label": "Updated At",
        "type": "datetime",
        "required": false,
        "nullable": false,
        "readOnly": true
      }
    ],
    "columns": [
      "order_number",
      "customer_id",
      "status",
      "payment_status",
      "total_price"
    ],
    "search": [
      "order_number",
      "shipping_status",
      "currency_code",
      "shipping_name",
      "shipping_phone",
      "shipping_address",
      "customer_notes",
      "internal_notes"
    ],
    "relations": [
      {
        "resource": "ip-reviews",
        "foreignKey": "order_id",
        "label": "IP & license reviews"
      },
      {
        "resource": "order-items",
        "foreignKey": "order_id",
        "label": "Order items"
      },
      {
        "resource": "order-packaging",
        "foreignKey": "order_id",
        "label": "Packaging"
      },
      {
        "resource": "production-costs",
        "foreignKey": "order_id",
        "label": "Costing & HPP"
      }
    ]
  },
  {
    "key": "order-items",
    "table": "order_items",
    "title": "Order items",
    "singular": "Order item",
    "description": "Products and custom designs included in an order.",
    "group": "Sales",
    "permission": "sales",
    "fields": [
      {
        "name": "order_id",
        "label": "Order",
        "type": "relation",
        "required": true,
        "nullable": false,
        "reference": "orders"
      },
      {
        "name": "product_id",
        "label": "Product",
        "type": "relation",
        "required": false,
        "nullable": true,
        "reference": "products"
      },
      {
        "name": "product_variant_id",
        "label": "Product Variant",
        "type": "relation",
        "required": false,
        "nullable": true,
        "reference": "product-variants"
      },
      {
        "name": "design_asset_id",
        "label": "Design Asset",
        "type": "relation",
        "required": false,
        "nullable": true,
        "reference": "design-assets"
      },
      {
        "name": "item_name",
        "label": "Item Name",
        "type": "text",
        "required": true,
        "nullable": false,
        "maxLength": 180
      },
      {
        "name": "description",
        "label": "Description",
        "type": "textarea",
        "required": false,
        "nullable": true
      },
      {
        "name": "quantity",
        "label": "Quantity",
        "type": "integer",
        "required": false,
        "nullable": false,
        "default": "1"
      },
      {
        "name": "unit_price",
        "label": "Unit Price",
        "type": "decimal",
        "required": false,
        "nullable": false,
        "precision": 14,
        "scale": 2,
        "default": "0.00"
      },
      {
        "name": "total_price",
        "label": "Total Price",
        "type": "decimal",
        "required": false,
        "nullable": false,
        "precision": 14,
        "scale": 2,
        "default": "0.00",
        "readOnly": true
      },
      {
        "name": "created_at",
        "label": "Created At",
        "type": "datetime",
        "required": false,
        "nullable": false,
        "readOnly": true
      },
      {
        "name": "updated_at",
        "label": "Updated At",
        "type": "datetime",
        "required": false,
        "nullable": false,
        "readOnly": true
      }
    ],
    "columns": [
      "item_name",
      "quantity",
      "unit_price",
      "total_price"
    ],
    "search": [
      "item_name",
      "description"
    ],
    "relations": [
      {
        "resource": "production-jobs",
        "foreignKey": "order_item_id",
        "label": "Production"
      }
    ]
  },
  {
    "key": "production-jobs",
    "table": "production_jobs",
    "title": "Production",
    "singular": "Production job",
    "description": "Plan the work for each order item and assign an operator.",
    "group": "Production",
    "permission": "production",
    "fields": [
      {
        "name": "job_number",
        "label": "Job Number",
        "type": "text",
        "required": false,
        "nullable": true,
        "maxLength": 60
      },
      {
        "name": "order_item_id",
        "label": "Order Item",
        "type": "relation",
        "required": true,
        "nullable": false,
        "reference": "order-items"
      },
      {
        "name": "assigned_operator_id",
        "label": "Assigned Operator",
        "type": "relation",
        "required": false,
        "nullable": true,
        "reference": "users"
      },
      {
        "name": "status",
        "label": "Status",
        "type": "select",
        "required": false,
        "nullable": false,
        "maxLength": 40,
        "default": "WAITING",
        "options": [
          "WAITING",
          "QUEUED",
          "IN_PROGRESS",
          "PRINTING",
          "QC",
          "PACKAGING",
          "COMPLETED",
          "ON_HOLD",
          "CANCELLED"
        ]
      },
      {
        "name": "priority",
        "label": "Priority",
        "type": "select",
        "required": false,
        "nullable": false,
        "maxLength": 20,
        "default": "NORMAL",
        "options": [
          "LOW",
          "NORMAL",
          "HIGH",
          "URGENT"
        ]
      },
      {
        "name": "planned_start",
        "label": "Planned Start",
        "type": "datetime",
        "required": false,
        "nullable": true
      },
      {
        "name": "planned_end",
        "label": "Planned End",
        "type": "datetime",
        "required": false,
        "nullable": true
      },
      {
        "name": "actual_start",
        "label": "Actual Start",
        "type": "datetime",
        "required": false,
        "nullable": true
      },
      {
        "name": "actual_end",
        "label": "Actual End",
        "type": "datetime",
        "required": false,
        "nullable": true
      },
      {
        "name": "notes",
        "label": "Notes",
        "type": "textarea",
        "required": false,
        "nullable": true
      },
      {
        "name": "created_at",
        "label": "Created At",
        "type": "datetime",
        "required": false,
        "nullable": false,
        "readOnly": true
      },
      {
        "name": "updated_at",
        "label": "Updated At",
        "type": "datetime",
        "required": false,
        "nullable": false,
        "readOnly": true
      }
    ],
    "columns": [
      "job_number",
      "order_item_id",
      "assigned_operator_id",
      "status",
      "priority"
    ],
    "search": [
      "job_number",
      "notes"
    ],
    "relations": [
      {
        "resource": "print-jobs",
        "foreignKey": "production_job_id",
        "label": "Print queue"
      },
      {
        "resource": "production-costs",
        "foreignKey": "production_job_id",
        "label": "Costing & HPP"
      },
      {
        "resource": "qc-inspections",
        "foreignKey": "production_job_id",
        "label": "Quality control"
      },
      {
        "resource": "slicing-results",
        "foreignKey": "production_job_id",
        "label": "Slicing results"
      }
    ]
  },
  {
    "key": "printers",
    "table": "printers",
    "title": "Printers",
    "singular": "Printer",
    "description": "Monitor your printer fleet and maintain machine details. Status is managed manually.",
    "group": "Production",
    "permission": "production",
    "fields": [
      {
        "name": "printer_catalog_id",
        "label": "Printer Catalog",
        "type": "relation",
        "required": false,
        "nullable": true,
        "reference": "printer-catalogs"
      },
      {
        "name": "printer_code",
        "label": "Printer Code",
        "type": "text",
        "required": false,
        "nullable": true,
        "maxLength": 60
      },
      {
        "name": "name",
        "label": "Name",
        "type": "text",
        "required": true,
        "nullable": false,
        "maxLength": 120
      },
      {
        "name": "brand",
        "label": "Brand",
        "type": "text",
        "required": false,
        "nullable": true,
        "maxLength": 120
      },
      {
        "name": "model",
        "label": "Model",
        "type": "text",
        "required": false,
        "nullable": true,
        "maxLength": 120
      },
      {
        "name": "serial_number",
        "label": "Serial Number",
        "type": "text",
        "required": false,
        "nullable": true,
        "maxLength": 120
      },
      {
        "name": "location",
        "label": "Location",
        "type": "text",
        "required": false,
        "nullable": true,
        "maxLength": 190
      },
      {
        "name": "build_volume_x_mm",
        "label": "Build Volume X (mm)",
        "type": "decimal",
        "required": false,
        "nullable": true,
        "precision": 10,
        "scale": 2
      },
      {
        "name": "build_volume_y_mm",
        "label": "Build Volume Y (mm)",
        "type": "decimal",
        "required": false,
        "nullable": true,
        "precision": 10,
        "scale": 2
      },
      {
        "name": "build_volume_z_mm",
        "label": "Build Volume Z (mm)",
        "type": "decimal",
        "required": false,
        "nullable": true,
        "precision": 10,
        "scale": 2
      },
      {
        "name": "default_nozzle_size_mm",
        "label": "Default Nozzle Size (mm)",
        "type": "decimal",
        "required": false,
        "nullable": true,
        "precision": 6,
        "scale": 3
      },
      {
        "name": "status",
        "label": "Status",
        "type": "select",
        "required": false,
        "nullable": false,
        "maxLength": 30,
        "default": "IDLE",
        "options": [
          "IDLE",
          "QUEUED",
          "PRINTING",
          "MAINTENANCE",
          "OFFLINE",
          "ERROR"
        ]
      },
      {
        "name": "last_maintenance_at",
        "label": "Last Maintenance At",
        "type": "datetime",
        "required": false,
        "nullable": true
      },
      {
        "name": "is_active",
        "label": "Is Active",
        "type": "boolean",
        "required": false,
        "nullable": false,
        "default": true
      },
      {
        "name": "created_at",
        "label": "Created At",
        "type": "datetime",
        "required": false,
        "nullable": false,
        "readOnly": true
      },
      {
        "name": "updated_at",
        "label": "Updated At",
        "type": "datetime",
        "required": false,
        "nullable": false,
        "readOnly": true
      }
    ],
    "columns": [
      "name",
      "brand",
      "model",
      "status",
      "location"
    ],
    "search": [
      "printer_code",
      "name",
      "brand",
      "model",
      "serial_number",
      "location"
    ],
    "relations": [
      {
        "resource": "experiments",
        "foreignKey": "printer_id",
        "label": "Experiments"
      },
      {
        "resource": "print-jobs",
        "foreignKey": "printer_id",
        "label": "Print queue"
      },
      {
        "resource": "print-profiles",
        "foreignKey": "printer_id",
        "label": "Print profiles"
      },
      {
        "resource": "slicing-results",
        "foreignKey": "printer_id",
        "label": "Slicing results"
      }
    ]
  },
  {
    "key": "print-profiles",
    "table": "print_profiles",
    "title": "Print profiles",
    "singular": "Print profile",
    "description": "Store practical slicer settings for repeatable printing.",
    "group": "Production",
    "permission": "production",
    "fields": [
      {
        "name": "printer_id",
        "label": "Printer",
        "type": "relation",
        "required": false,
        "nullable": true,
        "reference": "printers"
      },
      {
        "name": "material_id",
        "label": "Material",
        "type": "relation",
        "required": false,
        "nullable": true,
        "reference": "materials"
      },
      {
        "name": "name",
        "label": "Name",
        "type": "text",
        "required": true,
        "nullable": false,
        "maxLength": 150
      },
      {
        "name": "nozzle_size_mm",
        "label": "Nozzle Size (mm)",
        "type": "decimal",
        "required": false,
        "nullable": true,
        "precision": 6,
        "scale": 3
      },
      {
        "name": "layer_height_mm",
        "label": "Layer Height (mm)",
        "type": "decimal",
        "required": false,
        "nullable": true,
        "precision": 6,
        "scale": 3
      },
      {
        "name": "nozzle_temperature_c",
        "label": "Nozzle Temperature C",
        "type": "decimal",
        "required": false,
        "nullable": true,
        "precision": 7,
        "scale": 2
      },
      {
        "name": "bed_temperature_c",
        "label": "Bed Temperature C",
        "type": "decimal",
        "required": false,
        "nullable": true,
        "precision": 7,
        "scale": 2
      },
      {
        "name": "print_speed_mm_s",
        "label": "Print Speed (mm) S",
        "type": "decimal",
        "required": false,
        "nullable": true,
        "precision": 10,
        "scale": 2
      },
      {
        "name": "infill_percentage",
        "label": "Infill Percentage",
        "type": "decimal",
        "required": false,
        "nullable": true,
        "precision": 6,
        "scale": 2
      },
      {
        "name": "support_setting",
        "label": "Support Setting",
        "type": "textarea",
        "required": false,
        "nullable": true
      },
      {
        "name": "additional_settings_json",
        "label": "Additional Settings JSON",
        "type": "json",
        "required": false,
        "nullable": true
      },
      {
        "name": "notes",
        "label": "Notes",
        "type": "textarea",
        "required": false,
        "nullable": true
      },
      {
        "name": "is_active",
        "label": "Is Active",
        "type": "boolean",
        "required": false,
        "nullable": false,
        "default": true
      },
      {
        "name": "created_at",
        "label": "Created At",
        "type": "datetime",
        "required": false,
        "nullable": false,
        "readOnly": true
      },
      {
        "name": "updated_at",
        "label": "Updated At",
        "type": "datetime",
        "required": false,
        "nullable": false,
        "readOnly": true
      }
    ],
    "columns": [
      "name",
      "printer_id",
      "material_id",
      "layer_height_mm",
      "is_active"
    ],
    "search": [
      "name",
      "support_setting",
      "notes"
    ],
    "relations": [
      {
        "resource": "experiments",
        "foreignKey": "print_profile_id",
        "label": "Experiments"
      },
      {
        "resource": "print-jobs",
        "foreignKey": "print_profile_id",
        "label": "Print queue"
      },
      {
        "resource": "slicing-results",
        "foreignKey": "print_profile_id",
        "label": "Slicing results"
      }
    ]
  },
  {
    "key": "slicing-results",
    "table": "slicing_results",
    "title": "Slicing results",
    "singular": "Slicing result",
    "description": "Record model weight, support consumption, dimensions, and estimated print time.",
    "group": "Production",
    "permission": "production",
    "fields": [
      {
        "name": "production_job_id",
        "label": "Production Job",
        "type": "relation",
        "required": true,
        "nullable": false,
        "reference": "production-jobs"
      },
      {
        "name": "design_asset_id",
        "label": "Design Asset",
        "type": "relation",
        "required": false,
        "nullable": true,
        "reference": "design-assets"
      },
      {
        "name": "printer_id",
        "label": "Printer",
        "type": "relation",
        "required": false,
        "nullable": true,
        "reference": "printers"
      },
      {
        "name": "print_profile_id",
        "label": "Print Profile",
        "type": "relation",
        "required": false,
        "nullable": true,
        "reference": "print-profiles"
      },
      {
        "name": "slicer_name",
        "label": "Slicer Name",
        "type": "text",
        "required": false,
        "nullable": true,
        "maxLength": 100
      },
      {
        "name": "slicer_version",
        "label": "Slicer Version",
        "type": "text",
        "required": false,
        "nullable": true,
        "maxLength": 60
      },
      {
        "name": "model_weight_gram",
        "label": "Model Weight (g)",
        "type": "decimal",
        "required": false,
        "nullable": true,
        "precision": 12,
        "scale": 3
      },
      {
        "name": "support_weight_gram",
        "label": "Support Weight (g)",
        "type": "decimal",
        "required": false,
        "nullable": true,
        "precision": 12,
        "scale": 3
      },
      {
        "name": "total_weight_gram",
        "label": "Total Weight (g)",
        "type": "decimal",
        "required": false,
        "nullable": true,
        "precision": 12,
        "scale": 3,
        "readOnly": true
      },
      {
        "name": "estimated_print_minutes",
        "label": "Estimated Print Minutes",
        "type": "integer",
        "required": false,
        "nullable": true
      },
      {
        "name": "model_size_x_mm",
        "label": "Model Size X (mm)",
        "type": "decimal",
        "required": false,
        "nullable": true,
        "precision": 10,
        "scale": 2
      },
      {
        "name": "model_size_y_mm",
        "label": "Model Size Y (mm)",
        "type": "decimal",
        "required": false,
        "nullable": true,
        "precision": 10,
        "scale": 2
      },
      {
        "name": "model_size_z_mm",
        "label": "Model Size Z (mm)",
        "type": "decimal",
        "required": false,
        "nullable": true,
        "precision": 10,
        "scale": 2
      },
      {
        "name": "is_selected",
        "label": "Is Selected",
        "type": "boolean",
        "required": false,
        "nullable": false,
        "default": false
      },
      {
        "name": "notes",
        "label": "Notes",
        "type": "textarea",
        "required": false,
        "nullable": true
      },
      {
        "name": "created_at",
        "label": "Created At",
        "type": "datetime",
        "required": false,
        "nullable": false,
        "readOnly": true
      }
    ],
    "columns": [
      "production_job_id",
      "slicer_name",
      "model_weight_gram",
      "total_weight_gram",
      "estimated_print_minutes"
    ],
    "search": [
      "slicer_name",
      "slicer_version",
      "notes"
    ],
    "relations": [
      {
        "resource": "print-jobs",
        "foreignKey": "slicing_result_id",
        "label": "Print queue"
      }
    ]
  },
  {
    "key": "materials",
    "table": "materials",
    "title": "Materials",
    "singular": "Material",
    "description": "Manage material specifications and manufacturers.",
    "group": "Inventory",
    "permission": "production",
    "fields": [
      {
        "name": "name",
        "label": "Name",
        "type": "text",
        "required": true,
        "nullable": false,
        "maxLength": 120
      },
      {
        "name": "material_type",
        "label": "Material Type",
        "type": "text",
        "required": true,
        "nullable": false,
        "maxLength": 60
      },
      {
        "name": "manufacturer",
        "label": "Manufacturer",
        "type": "text",
        "required": false,
        "nullable": true,
        "maxLength": 120
      },
      {
        "name": "description",
        "label": "Description",
        "type": "textarea",
        "required": false,
        "nullable": true
      },
      {
        "name": "is_active",
        "label": "Is Active",
        "type": "boolean",
        "required": false,
        "nullable": false,
        "default": true
      },
      {
        "name": "created_at",
        "label": "Created At",
        "type": "datetime",
        "required": false,
        "nullable": false,
        "readOnly": true
      },
      {
        "name": "updated_at",
        "label": "Updated At",
        "type": "datetime",
        "required": false,
        "nullable": false,
        "readOnly": true
      }
    ],
    "columns": [
      "name",
      "material_type",
      "manufacturer",
      "is_active"
    ],
    "search": [
      "name",
      "material_type",
      "manufacturer",
      "description"
    ],
    "relations": [
      {
        "resource": "custom-requests",
        "foreignKey": "preferred_material_id",
        "label": "Custom requests"
      },
      {
        "resource": "experiments",
        "foreignKey": "material_id",
        "label": "Experiments"
      },
      {
        "resource": "filament-spools",
        "foreignKey": "material_id",
        "label": "Filament inventory"
      },
      {
        "resource": "pricing-rules",
        "foreignKey": "material_id",
        "label": "Pricing rules"
      },
      {
        "resource": "print-profiles",
        "foreignKey": "material_id",
        "label": "Print profiles"
      },
      {
        "resource": "product-variants",
        "foreignKey": "material_id",
        "label": "Variants"
      },
      {
        "resource": "products",
        "foreignKey": "default_material_id",
        "label": "Products"
      },
      {
        "resource": "quotation-items",
        "foreignKey": "material_id",
        "label": "Quotation items"
      }
    ]
  },
  {
    "key": "filament-spools",
    "table": "filament_spools",
    "title": "Filament inventory",
    "singular": "Filament spool",
    "description": "Track spool stock in grams and purchase cost. Adjustments are audited.",
    "group": "Inventory",
    "permission": "production",
    "fields": [
      {
        "name": "material_id",
        "label": "Material",
        "type": "relation",
        "required": true,
        "nullable": false,
        "reference": "materials"
      },
      {
        "name": "spool_code",
        "label": "Spool Code",
        "type": "text",
        "required": false,
        "nullable": true,
        "maxLength": 60
      },
      {
        "name": "brand",
        "label": "Brand",
        "type": "text",
        "required": false,
        "nullable": true,
        "maxLength": 120
      },
      {
        "name": "color_name",
        "label": "Color Name",
        "type": "text",
        "required": false,
        "nullable": true,
        "maxLength": 100
      },
      {
        "name": "color_hex",
        "label": "Color Hex",
        "type": "text",
        "required": false,
        "nullable": true,
        "maxLength": 10
      },
      {
        "name": "batch_number",
        "label": "Batch Number",
        "type": "text",
        "required": false,
        "nullable": true,
        "maxLength": 100
      },
      {
        "name": "initial_weight_gram",
        "label": "Initial Weight (g)",
        "type": "decimal",
        "required": false,
        "nullable": false,
        "precision": 12,
        "scale": 3,
        "default": "0.000"
      },
      {
        "name": "remaining_weight_gram",
        "label": "Remaining Weight (g)",
        "type": "decimal",
        "required": false,
        "nullable": false,
        "precision": 12,
        "scale": 3,
        "default": "0.000"
      },
      {
        "name": "purchase_price",
        "label": "Purchase Price",
        "type": "decimal",
        "required": false,
        "nullable": false,
        "precision": 14,
        "scale": 2,
        "default": "0.00"
      },
      {
        "name": "cost_per_gram",
        "label": "Cost Per (g)",
        "type": "decimal",
        "required": false,
        "nullable": false,
        "precision": 14,
        "scale": 4,
        "default": "0.0000",
        "readOnly": true
      },
      {
        "name": "purchased_at",
        "label": "Purchased At",
        "type": "datetime",
        "required": false,
        "nullable": true
      },
      {
        "name": "status",
        "label": "Status",
        "type": "select",
        "required": false,
        "nullable": false,
        "maxLength": 30,
        "default": "AVAILABLE",
        "options": [
          "AVAILABLE",
          "IN_USE",
          "LOW",
          "EMPTY",
          "ARCHIVED"
        ]
      },
      {
        "name": "notes",
        "label": "Notes",
        "type": "textarea",
        "required": false,
        "nullable": true
      },
      {
        "name": "created_at",
        "label": "Created At",
        "type": "datetime",
        "required": false,
        "nullable": false,
        "readOnly": true
      },
      {
        "name": "updated_at",
        "label": "Updated At",
        "type": "datetime",
        "required": false,
        "nullable": false,
        "readOnly": true
      }
    ],
    "columns": [
      "spool_code",
      "material_id",
      "color_name",
      "remaining_weight_gram",
      "status"
    ],
    "search": [
      "spool_code",
      "brand",
      "color_name",
      "color_hex",
      "batch_number",
      "notes"
    ],
    "relations": [
      {
        "resource": "material-usages",
        "foreignKey": "filament_spool_id",
        "label": "Material usage"
      }
    ]
  },
  {
    "key": "material-usages",
    "table": "material_usages",
    "title": "Material usage",
    "singular": "Material usage",
    "description": "Record real consumption or waste against a print attempt; stock is deducted atomically.",
    "group": "Inventory",
    "permission": "production",
    "fields": [
      {
        "name": "print_job_id",
        "label": "Print Job",
        "type": "relation",
        "required": true,
        "nullable": false,
        "reference": "print-jobs"
      },
      {
        "name": "filament_spool_id",
        "label": "Filament Spool",
        "type": "relation",
        "required": true,
        "nullable": false,
        "reference": "filament-spools"
      },
      {
        "name": "usage_type",
        "label": "Usage Type",
        "type": "select",
        "required": true,
        "nullable": false,
        "maxLength": 40,
        "options": [
          "MODEL",
          "SUPPORT",
          "WASTE",
          "PURGE",
          "OTHER"
        ]
      },
      {
        "name": "weight_gram",
        "label": "Weight (g)",
        "type": "decimal",
        "required": false,
        "nullable": false,
        "precision": 12,
        "scale": 3,
        "default": "0.000"
      },
      {
        "name": "cost_per_gram",
        "label": "Cost Per (g)",
        "type": "decimal",
        "required": false,
        "nullable": false,
        "precision": 14,
        "scale": 4,
        "default": "0.0000",
        "readOnly": true
      },
      {
        "name": "total_cost",
        "label": "Total Cost",
        "type": "decimal",
        "required": false,
        "nullable": false,
        "precision": 14,
        "scale": 2,
        "default": "0.00",
        "readOnly": true
      },
      {
        "name": "notes",
        "label": "Notes",
        "type": "textarea",
        "required": false,
        "nullable": true
      },
      {
        "name": "created_at",
        "label": "Created At",
        "type": "datetime",
        "required": false,
        "nullable": false,
        "readOnly": true
      }
    ],
    "columns": [
      "print_job_id",
      "filament_spool_id",
      "usage_type",
      "weight_gram",
      "total_cost"
    ],
    "search": [
      "notes"
    ]
  },
  {
    "key": "print-jobs",
    "table": "print_jobs",
    "title": "Print queue",
    "singular": "Print job",
    "description": "Track individual print attempts, including retries and failed runs.",
    "group": "Production",
    "permission": "production",
    "fields": [
      {
        "name": "print_job_number",
        "label": "Print Job Number",
        "type": "text",
        "required": false,
        "nullable": true,
        "maxLength": 60
      },
      {
        "name": "production_job_id",
        "label": "Production Job",
        "type": "relation",
        "required": true,
        "nullable": false,
        "reference": "production-jobs"
      },
      {
        "name": "printer_id",
        "label": "Printer",
        "type": "relation",
        "required": false,
        "nullable": true,
        "reference": "printers"
      },
      {
        "name": "print_profile_id",
        "label": "Print Profile",
        "type": "relation",
        "required": false,
        "nullable": true,
        "reference": "print-profiles"
      },
      {
        "name": "slicing_result_id",
        "label": "Slicing Result",
        "type": "relation",
        "required": false,
        "nullable": true,
        "reference": "slicing-results"
      },
      {
        "name": "operator_id",
        "label": "Operator",
        "type": "relation",
        "required": false,
        "nullable": true,
        "reference": "users"
      },
      {
        "name": "status",
        "label": "Status",
        "type": "select",
        "required": false,
        "nullable": false,
        "maxLength": 40,
        "default": "QUEUED",
        "options": [
          "QUEUED",
          "PRINTING",
          "PAUSED",
          "SUCCESS",
          "FAILED",
          "CANCELLED"
        ]
      },
      {
        "name": "queue_position",
        "label": "Queue Position",
        "type": "integer",
        "required": false,
        "nullable": true
      },
      {
        "name": "queued_at",
        "label": "Queued At",
        "type": "datetime",
        "required": false,
        "nullable": true
      },
      {
        "name": "started_at",
        "label": "Started At",
        "type": "datetime",
        "required": false,
        "nullable": true
      },
      {
        "name": "completed_at",
        "label": "Completed At",
        "type": "datetime",
        "required": false,
        "nullable": true
      },
      {
        "name": "estimated_weight_gram",
        "label": "Estimated Weight (g)",
        "type": "decimal",
        "required": false,
        "nullable": true,
        "precision": 12,
        "scale": 3
      },
      {
        "name": "actual_weight_gram",
        "label": "Actual Weight (g)",
        "type": "decimal",
        "required": false,
        "nullable": true,
        "precision": 12,
        "scale": 3
      },
      {
        "name": "estimated_print_minutes",
        "label": "Estimated Print Minutes",
        "type": "integer",
        "required": false,
        "nullable": true
      },
      {
        "name": "actual_print_minutes",
        "label": "Actual Print Minutes",
        "type": "integer",
        "required": false,
        "nullable": true
      },
      {
        "name": "notes",
        "label": "Notes",
        "type": "textarea",
        "required": false,
        "nullable": true
      },
      {
        "name": "created_at",
        "label": "Created At",
        "type": "datetime",
        "required": false,
        "nullable": false,
        "readOnly": true
      },
      {
        "name": "updated_at",
        "label": "Updated At",
        "type": "datetime",
        "required": false,
        "nullable": false,
        "readOnly": true
      }
    ],
    "columns": [
      "print_job_number",
      "production_job_id",
      "printer_id",
      "status",
      "estimated_print_minutes"
    ],
    "search": [
      "print_job_number",
      "notes"
    ],
    "relations": [
      {
        "resource": "material-usages",
        "foreignKey": "print_job_id",
        "label": "Material usage"
      },
      {
        "resource": "print-failures",
        "foreignKey": "print_job_id",
        "label": "Failures & waste"
      },
      {
        "resource": "production-costs",
        "foreignKey": "print_job_id",
        "label": "Costing & HPP"
      },
      {
        "resource": "qc-inspections",
        "foreignKey": "print_job_id",
        "label": "Quality control"
      }
    ]
  },
  {
    "key": "print-failures",
    "table": "print_failures",
    "title": "Failures & waste",
    "singular": "Print failure",
    "description": "Capture failed prints, wasted filament, root causes, and corrective action.",
    "group": "Quality",
    "permission": "production",
    "fields": [
      {
        "name": "print_job_id",
        "label": "Print Job",
        "type": "relation",
        "required": true,
        "nullable": false,
        "reference": "print-jobs"
      },
      {
        "name": "failure_type",
        "label": "Failure Type",
        "type": "select",
        "required": true,
        "nullable": false,
        "maxLength": 60,
        "options": [
          "BED_ADHESION",
          "LAYER_SHIFT",
          "STRINGING",
          "CLOGGING",
          "WARPING",
          "SUPPORT_FAILURE",
          "POWER_FAILURE",
          "OTHER"
        ]
      },
      {
        "name": "description",
        "label": "Description",
        "type": "textarea",
        "required": false,
        "nullable": true
      },
      {
        "name": "failed_at_percentage",
        "label": "Failed At Percentage",
        "type": "decimal",
        "required": false,
        "nullable": true,
        "precision": 6,
        "scale": 2
      },
      {
        "name": "wasted_weight_gram",
        "label": "Wasted Weight (g)",
        "type": "decimal",
        "required": false,
        "nullable": true,
        "precision": 12,
        "scale": 3
      },
      {
        "name": "root_cause",
        "label": "Root Cause",
        "type": "textarea",
        "required": false,
        "nullable": true
      },
      {
        "name": "corrective_action",
        "label": "Corrective Action",
        "type": "textarea",
        "required": false,
        "nullable": true
      },
      {
        "name": "created_at",
        "label": "Created At",
        "type": "datetime",
        "required": false,
        "nullable": false,
        "readOnly": true
      }
    ],
    "columns": [
      "print_job_id",
      "failure_type",
      "wasted_weight_gram",
      "created_at"
    ],
    "search": [
      "description",
      "root_cause",
      "corrective_action"
    ]
  },
  {
    "key": "experiments",
    "table": "experiments",
    "title": "Experiments",
    "singular": "Experiment",
    "description": "Preserve the findings from material and print-setting experiments.",
    "group": "Quality",
    "permission": "production",
    "fields": [
      {
        "name": "experiment_number",
        "label": "Experiment Number",
        "type": "text",
        "required": false,
        "nullable": true,
        "maxLength": 60
      },
      {
        "name": "title",
        "label": "Title",
        "type": "text",
        "required": true,
        "nullable": false,
        "maxLength": 180
      },
      {
        "name": "printer_id",
        "label": "Printer",
        "type": "relation",
        "required": false,
        "nullable": true,
        "reference": "printers"
      },
      {
        "name": "material_id",
        "label": "Material",
        "type": "relation",
        "required": false,
        "nullable": true,
        "reference": "materials"
      },
      {
        "name": "print_profile_id",
        "label": "Print Profile",
        "type": "relation",
        "required": false,
        "nullable": true,
        "reference": "print-profiles"
      },
      {
        "name": "objective",
        "label": "Objective",
        "type": "textarea",
        "required": false,
        "nullable": true
      },
      {
        "name": "result_summary",
        "label": "Result Summary",
        "type": "textarea",
        "required": false,
        "nullable": true
      },
      {
        "name": "result_status",
        "label": "Result Status",
        "type": "text",
        "required": false,
        "nullable": true,
        "maxLength": 40
      },
      {
        "name": "notes",
        "label": "Notes",
        "type": "textarea",
        "required": false,
        "nullable": true
      },
      {
        "name": "performed_by_user_id",
        "label": "Performed By User",
        "type": "relation",
        "required": false,
        "nullable": true,
        "reference": "users"
      },
      {
        "name": "performed_at",
        "label": "Performed At",
        "type": "datetime",
        "required": false,
        "nullable": true
      },
      {
        "name": "created_at",
        "label": "Created At",
        "type": "datetime",
        "required": false,
        "nullable": false,
        "readOnly": true
      },
      {
        "name": "updated_at",
        "label": "Updated At",
        "type": "datetime",
        "required": false,
        "nullable": false,
        "readOnly": true
      }
    ],
    "columns": [
      "experiment_number",
      "title",
      "result_status",
      "performed_at"
    ],
    "search": [
      "experiment_number",
      "title",
      "objective",
      "result_summary",
      "result_status",
      "notes"
    ],
    "relations": [
      {
        "resource": "experiment-measurements",
        "foreignKey": "experiment_id",
        "label": "Measurements"
      }
    ]
  },
  {
    "key": "experiment-measurements",
    "table": "experiment_measurements",
    "title": "Measurements",
    "singular": "Measurement",
    "description": "Record experimental parameters and results with explicit units.",
    "group": "Quality",
    "permission": "production",
    "fields": [
      {
        "name": "experiment_id",
        "label": "Experiment",
        "type": "relation",
        "required": true,
        "nullable": false,
        "reference": "experiments"
      },
      {
        "name": "parameter_name",
        "label": "Parameter Name",
        "type": "text",
        "required": true,
        "nullable": false,
        "maxLength": 120
      },
      {
        "name": "parameter_value",
        "label": "Parameter Value",
        "type": "text",
        "required": false,
        "nullable": true,
        "maxLength": 255
      },
      {
        "name": "unit",
        "label": "Unit",
        "type": "text",
        "required": false,
        "nullable": true,
        "maxLength": 60
      },
      {
        "name": "created_at",
        "label": "Created At",
        "type": "datetime",
        "required": false,
        "nullable": false,
        "readOnly": true
      }
    ],
    "columns": [
      "parameter_name",
      "parameter_value",
      "unit"
    ],
    "search": [
      "parameter_name",
      "parameter_value",
      "unit"
    ]
  },
  {
    "key": "cost-components",
    "table": "cost_components",
    "title": "Cost components",
    "singular": "Cost component",
    "description": "Define materials, machine time, electricity, design, waste, and packaging costs.",
    "group": "Finance",
    "permission": "finance",
    "fields": [
      {
        "name": "name",
        "label": "Name",
        "type": "text",
        "required": true,
        "nullable": false,
        "maxLength": 120
      },
      {
        "name": "code",
        "label": "Code",
        "type": "text",
        "required": false,
        "nullable": true,
        "maxLength": 60
      },
      {
        "name": "category",
        "label": "Category",
        "type": "text",
        "required": true,
        "nullable": false,
        "maxLength": 60
      },
      {
        "name": "calculation_type",
        "label": "Calculation Type",
        "type": "select",
        "required": false,
        "nullable": false,
        "maxLength": 50,
        "default": "MANUAL",
        "options": [
          "MANUAL",
          "PER_GRAM",
          "PER_HOUR",
          "PER_UNIT"
        ]
      },
      {
        "name": "default_unit",
        "label": "Default Unit",
        "type": "text",
        "required": false,
        "nullable": true,
        "maxLength": 40
      },
      {
        "name": "default_unit_cost",
        "label": "Default Unit Cost",
        "type": "decimal",
        "required": false,
        "nullable": true,
        "precision": 14,
        "scale": 4
      },
      {
        "name": "description",
        "label": "Description",
        "type": "textarea",
        "required": false,
        "nullable": true
      },
      {
        "name": "is_active",
        "label": "Is Active",
        "type": "boolean",
        "required": false,
        "nullable": false,
        "default": true
      },
      {
        "name": "created_at",
        "label": "Created At",
        "type": "datetime",
        "required": false,
        "nullable": false,
        "readOnly": true
      },
      {
        "name": "updated_at",
        "label": "Updated At",
        "type": "datetime",
        "required": false,
        "nullable": false,
        "readOnly": true
      }
    ],
    "columns": [
      "name",
      "category",
      "calculation_type",
      "default_unit_cost",
      "is_active"
    ],
    "search": [
      "name",
      "code",
      "category",
      "default_unit",
      "description"
    ],
    "relations": [
      {
        "resource": "production-costs",
        "foreignKey": "cost_component_id",
        "label": "Costing & HPP"
      }
    ]
  },
  {
    "key": "production-costs",
    "table": "production_costs",
    "title": "Costing & HPP",
    "singular": "Production cost",
    "description": "Itemize estimated and actual costs. HPP is derived from these components.",
    "group": "Finance",
    "permission": "finance",
    "fields": [
      {
        "name": "order_id",
        "label": "Order",
        "type": "relation",
        "required": false,
        "nullable": true,
        "reference": "orders"
      },
      {
        "name": "production_job_id",
        "label": "Production Job",
        "type": "relation",
        "required": false,
        "nullable": true,
        "reference": "production-jobs"
      },
      {
        "name": "print_job_id",
        "label": "Print Job",
        "type": "relation",
        "required": false,
        "nullable": true,
        "reference": "print-jobs"
      },
      {
        "name": "cost_component_id",
        "label": "Cost Component",
        "type": "relation",
        "required": true,
        "nullable": false,
        "reference": "cost-components"
      },
      {
        "name": "cost_type",
        "label": "Cost Type",
        "type": "select",
        "required": false,
        "nullable": false,
        "maxLength": 20,
        "default": "ACTUAL",
        "options": [
          "ESTIMATED",
          "ACTUAL"
        ]
      },
      {
        "name": "description",
        "label": "Description",
        "type": "text",
        "required": false,
        "nullable": true,
        "maxLength": 255
      },
      {
        "name": "quantity",
        "label": "Quantity",
        "type": "decimal",
        "required": false,
        "nullable": false,
        "precision": 14,
        "scale": 4,
        "default": "1.0000"
      },
      {
        "name": "unit",
        "label": "Unit",
        "type": "text",
        "required": false,
        "nullable": true,
        "maxLength": 40
      },
      {
        "name": "unit_cost",
        "label": "Unit Cost",
        "type": "decimal",
        "required": false,
        "nullable": false,
        "precision": 14,
        "scale": 4,
        "default": "0.0000"
      },
      {
        "name": "total_cost",
        "label": "Total Cost",
        "type": "decimal",
        "required": false,
        "nullable": false,
        "precision": 14,
        "scale": 2,
        "default": "0.00",
        "readOnly": true
      },
      {
        "name": "created_at",
        "label": "Created At",
        "type": "datetime",
        "required": false,
        "nullable": false,
        "readOnly": true
      },
      {
        "name": "updated_at",
        "label": "Updated At",
        "type": "datetime",
        "required": false,
        "nullable": false,
        "readOnly": true
      }
    ],
    "columns": [
      "description",
      "cost_type",
      "quantity",
      "unit_cost",
      "total_cost"
    ],
    "search": [
      "description",
      "unit"
    ]
  },
  {
    "key": "qc-inspections",
    "table": "qc_inspections",
    "title": "Quality control",
    "singular": "QC inspection",
    "description": "Inspect completed prints and record pass, rework, or reprint decisions.",
    "group": "Quality",
    "permission": "production",
    "fields": [
      {
        "name": "production_job_id",
        "label": "Production Job",
        "type": "relation",
        "required": true,
        "nullable": false,
        "reference": "production-jobs"
      },
      {
        "name": "print_job_id",
        "label": "Print Job",
        "type": "relation",
        "required": false,
        "nullable": true,
        "reference": "print-jobs"
      },
      {
        "name": "result",
        "label": "Result",
        "type": "select",
        "required": true,
        "nullable": false,
        "maxLength": 30,
        "options": [
          "PASS",
          "FAIL",
          "REWORK",
          "REPRINT"
        ]
      },
      {
        "name": "inspected_by_user_id",
        "label": "Inspected By User",
        "type": "relation",
        "required": false,
        "nullable": true,
        "reference": "users"
      },
      {
        "name": "inspected_at",
        "label": "Inspected At",
        "type": "datetime",
        "required": false,
        "nullable": true
      },
      {
        "name": "notes",
        "label": "Notes",
        "type": "textarea",
        "required": false,
        "nullable": true
      },
      {
        "name": "created_at",
        "label": "Created At",
        "type": "datetime",
        "required": false,
        "nullable": false,
        "readOnly": true
      }
    ],
    "columns": [
      "production_job_id",
      "print_job_id",
      "result",
      "inspected_at"
    ],
    "search": [
      "notes"
    ],
    "relations": [
      {
        "resource": "qc-check-items",
        "foreignKey": "qc_inspection_id",
        "label": "QC checklist"
      }
    ]
  },
  {
    "key": "qc-check-items",
    "table": "qc_check_items",
    "title": "QC checklist",
    "singular": "QC check",
    "description": "Record dimensions, surface quality, color, assembly, and completeness.",
    "group": "Quality",
    "permission": "production",
    "fields": [
      {
        "name": "qc_inspection_id",
        "label": "Qc Inspection",
        "type": "relation",
        "required": true,
        "nullable": false,
        "reference": "qc-inspections"
      },
      {
        "name": "check_name",
        "label": "Check Name",
        "type": "text",
        "required": true,
        "nullable": false,
        "maxLength": 150
      },
      {
        "name": "result",
        "label": "Result",
        "type": "text",
        "required": true,
        "nullable": false,
        "maxLength": 30
      },
      {
        "name": "notes",
        "label": "Notes",
        "type": "textarea",
        "required": false,
        "nullable": true
      },
      {
        "name": "created_at",
        "label": "Created At",
        "type": "datetime",
        "required": false,
        "nullable": false,
        "readOnly": true
      }
    ],
    "columns": [
      "check_name",
      "result",
      "notes"
    ],
    "search": [
      "check_name",
      "result",
      "notes"
    ]
  },
  {
    "key": "packaging-types",
    "table": "packaging_types",
    "title": "Packaging types",
    "singular": "Packaging type",
    "description": "Maintain packing materials and standard costs.",
    "group": "Quality",
    "permission": "production",
    "fields": [
      {
        "name": "name",
        "label": "Name",
        "type": "text",
        "required": true,
        "nullable": false,
        "maxLength": 150
      },
      {
        "name": "description",
        "label": "Description",
        "type": "textarea",
        "required": false,
        "nullable": true
      },
      {
        "name": "default_cost",
        "label": "Default Cost",
        "type": "decimal",
        "required": false,
        "nullable": false,
        "precision": 14,
        "scale": 2,
        "default": "0.00"
      },
      {
        "name": "is_active",
        "label": "Is Active",
        "type": "boolean",
        "required": false,
        "nullable": false,
        "default": true
      },
      {
        "name": "created_at",
        "label": "Created At",
        "type": "datetime",
        "required": false,
        "nullable": false,
        "readOnly": true
      },
      {
        "name": "updated_at",
        "label": "Updated At",
        "type": "datetime",
        "required": false,
        "nullable": false,
        "readOnly": true
      }
    ],
    "columns": [
      "name",
      "default_cost",
      "is_active"
    ],
    "search": [
      "name",
      "description"
    ],
    "relations": [
      {
        "resource": "order-packaging",
        "foreignKey": "packaging_type_id",
        "label": "Packaging"
      }
    ]
  },
  {
    "key": "order-packaging",
    "table": "order_packaging",
    "title": "Packaging",
    "singular": "Order packaging",
    "description": "Record packing work and actual costs for each order.",
    "group": "Quality",
    "permission": "production",
    "fields": [
      {
        "name": "order_id",
        "label": "Order",
        "type": "relation",
        "required": true,
        "nullable": false,
        "reference": "orders"
      },
      {
        "name": "packaging_type_id",
        "label": "Packaging Type",
        "type": "relation",
        "required": true,
        "nullable": false,
        "reference": "packaging-types"
      },
      {
        "name": "quantity",
        "label": "Quantity",
        "type": "integer",
        "required": false,
        "nullable": false,
        "default": "1"
      },
      {
        "name": "actual_cost",
        "label": "Actual Cost",
        "type": "decimal",
        "required": false,
        "nullable": false,
        "precision": 14,
        "scale": 2,
        "default": "0.00"
      },
      {
        "name": "status",
        "label": "Status",
        "type": "select",
        "required": false,
        "nullable": false,
        "maxLength": 30,
        "default": "PENDING",
        "options": [
          "PENDING",
          "PACKING",
          "PACKED",
          "CANCELLED"
        ]
      },
      {
        "name": "packed_by_user_id",
        "label": "Packed By User",
        "type": "relation",
        "required": false,
        "nullable": true,
        "reference": "users"
      },
      {
        "name": "packed_at",
        "label": "Packed At",
        "type": "datetime",
        "required": false,
        "nullable": true
      },
      {
        "name": "notes",
        "label": "Notes",
        "type": "textarea",
        "required": false,
        "nullable": true
      },
      {
        "name": "created_at",
        "label": "Created At",
        "type": "datetime",
        "required": false,
        "nullable": false,
        "readOnly": true
      },
      {
        "name": "updated_at",
        "label": "Updated At",
        "type": "datetime",
        "required": false,
        "nullable": false,
        "readOnly": true
      }
    ],
    "columns": [
      "order_id",
      "packaging_type_id",
      "quantity",
      "actual_cost",
      "status"
    ],
    "search": [
      "notes"
    ]
  },
  {
    "key": "ip-reviews",
    "table": "ip_reviews",
    "title": "IP & license reviews",
    "singular": "IP review",
    "description": "Document human review of design ownership and commercial-use concerns.",
    "group": "Quality",
    "permission": "design",
    "fields": [
      {
        "name": "custom_request_id",
        "label": "Custom Request",
        "type": "relation",
        "required": false,
        "nullable": true,
        "reference": "custom-requests"
      },
      {
        "name": "order_id",
        "label": "Order",
        "type": "relation",
        "required": false,
        "nullable": true,
        "reference": "orders"
      },
      {
        "name": "status",
        "label": "Status",
        "type": "select",
        "required": false,
        "nullable": false,
        "maxLength": 30,
        "default": "NEEDS_REVIEW",
        "options": [
          "NEEDS_REVIEW",
          "CLEAR",
          "RESTRICTED"
        ]
      },
      {
        "name": "reviewed_by_user_id",
        "label": "Reviewed By User",
        "type": "relation",
        "required": false,
        "nullable": true,
        "reference": "users"
      },
      {
        "name": "reviewed_at",
        "label": "Reviewed At",
        "type": "datetime",
        "required": false,
        "nullable": true
      },
      {
        "name": "notes",
        "label": "Notes",
        "type": "textarea",
        "required": false,
        "nullable": true
      },
      {
        "name": "created_at",
        "label": "Created At",
        "type": "datetime",
        "required": false,
        "nullable": false,
        "readOnly": true
      },
      {
        "name": "updated_at",
        "label": "Updated At",
        "type": "datetime",
        "required": false,
        "nullable": false,
        "readOnly": true
      }
    ],
    "columns": [
      "custom_request_id",
      "order_id",
      "status",
      "reviewed_at"
    ],
    "search": [
      "notes"
    ],
    "relations": [
      {
        "resource": "ip-review-checklists",
        "foreignKey": "ip_review_id",
        "label": "IP checklist"
      }
    ]
  },
  {
    "key": "ip-review-checklists",
    "table": "ip_review_checklists",
    "title": "IP checklist",
    "singular": "IP check",
    "description": "Record the checks supporting a design license review.",
    "group": "Quality",
    "permission": "design",
    "fields": [
      {
        "name": "ip_review_id",
        "label": "Ip Review",
        "type": "relation",
        "required": true,
        "nullable": false,
        "reference": "ip-reviews"
      },
      {
        "name": "check_type",
        "label": "Check Type",
        "type": "text",
        "required": true,
        "nullable": false,
        "maxLength": 100
      },
      {
        "name": "result",
        "label": "Result",
        "type": "text",
        "required": false,
        "nullable": true,
        "maxLength": 30
      },
      {
        "name": "notes",
        "label": "Notes",
        "type": "textarea",
        "required": false,
        "nullable": true
      },
      {
        "name": "created_at",
        "label": "Created At",
        "type": "datetime",
        "required": false,
        "nullable": false,
        "readOnly": true
      }
    ],
    "columns": [
      "check_type",
      "result",
      "notes"
    ],
    "search": [
      "check_type",
      "result",
      "notes"
    ]
  },
  {
    "key": "notification-settings",
    "table": "notification_settings",
    "title": "Notification settings",
    "singular": "Notification setting",
    "description": "Configure event channels. Only in-app delivery is enabled in this foundation.",
    "group": "Settings",
    "permission": "settings",
    "fields": [
      {
        "name": "event_key",
        "label": "Event Key",
        "type": "text",
        "required": true,
        "nullable": false,
        "maxLength": 100
      },
      {
        "name": "channel",
        "label": "Channel",
        "type": "select",
        "required": true,
        "nullable": false,
        "maxLength": 40,
        "options": [
          "IN_APP",
          "EMAIL",
          "WHATSAPP"
        ]
      },
      {
        "name": "destination",
        "label": "Destination",
        "type": "text",
        "required": false,
        "nullable": true,
        "maxLength": 190
      },
      {
        "name": "provider",
        "label": "Provider",
        "type": "text",
        "required": false,
        "nullable": true,
        "maxLength": 80
      },
      {
        "name": "is_enabled",
        "label": "Is Enabled",
        "type": "boolean",
        "required": false,
        "nullable": false,
        "default": false
      },
      {
        "name": "config_json",
        "label": "Config JSON",
        "type": "json",
        "required": false,
        "nullable": true
      },
      {
        "name": "created_at",
        "label": "Created At",
        "type": "datetime",
        "required": false,
        "nullable": false,
        "readOnly": true
      },
      {
        "name": "updated_at",
        "label": "Updated At",
        "type": "datetime",
        "required": false,
        "nullable": false,
        "readOnly": true
      }
    ],
    "columns": [
      "event_key",
      "channel",
      "is_enabled"
    ],
    "search": [
      "event_key",
      "destination",
      "provider"
    ]
  },
  {
    "key": "notifications",
    "table": "notifications",
    "title": "Notifications",
    "singular": "Notification",
    "description": "Updates for your work in this workspace.",
    "group": "Workspace",
    "permission": "read",
    "fields": [
      {
        "name": "recipient_user_id",
        "label": "Recipient User",
        "type": "relation",
        "required": true,
        "nullable": false,
        "reference": "users",
        "readOnly": true
      },
      {
        "name": "event_type",
        "label": "Event Type",
        "type": "text",
        "required": true,
        "nullable": false,
        "maxLength": 100,
        "readOnly": true
      },
      {
        "name": "entity_type",
        "label": "Entity Type",
        "type": "text",
        "required": false,
        "nullable": true,
        "maxLength": 80,
        "readOnly": true
      },
      {
        "name": "entity_id",
        "label": "Entity",
        "type": "integer",
        "required": false,
        "nullable": true,
        "readOnly": true
      },
      {
        "name": "title",
        "label": "Title",
        "type": "text",
        "required": true,
        "nullable": false,
        "maxLength": 190,
        "readOnly": true
      },
      {
        "name": "message",
        "label": "Message",
        "type": "textarea",
        "required": false,
        "nullable": true,
        "readOnly": true
      },
      {
        "name": "read_at",
        "label": "Read At",
        "type": "datetime",
        "required": false,
        "nullable": true,
        "readOnly": true
      },
      {
        "name": "created_at",
        "label": "Created At",
        "type": "datetime",
        "required": false,
        "nullable": false,
        "readOnly": true
      }
    ],
    "columns": [
      "title",
      "message",
      "read_at",
      "created_at"
    ],
    "search": [],
    "readOnly": true
  },
  {
    "key": "audit-logs",
    "table": "audit_logs",
    "title": "Audit log",
    "singular": "Audit entry",
    "description": "A history of important changes made in this workspace.",
    "group": "Workspace",
    "permission": "audit",
    "fields": [
      {
        "name": "user_id",
        "label": "User",
        "type": "relation",
        "required": false,
        "nullable": true,
        "reference": "users",
        "readOnly": true
      },
      {
        "name": "action",
        "label": "Action",
        "type": "text",
        "required": true,
        "nullable": false,
        "maxLength": 100,
        "readOnly": true
      },
      {
        "name": "entity_type",
        "label": "Entity Type",
        "type": "text",
        "required": true,
        "nullable": false,
        "maxLength": 100,
        "readOnly": true
      },
      {
        "name": "entity_id",
        "label": "Entity",
        "type": "integer",
        "required": false,
        "nullable": true,
        "readOnly": true
      },
      {
        "name": "old_value_json",
        "label": "Old Value JSON",
        "type": "json",
        "required": false,
        "nullable": true,
        "readOnly": true
      },
      {
        "name": "new_value_json",
        "label": "New Value JSON",
        "type": "json",
        "required": false,
        "nullable": true,
        "readOnly": true
      },
      {
        "name": "ip_address",
        "label": "Ip Address",
        "type": "text",
        "required": false,
        "nullable": true,
        "maxLength": 45,
        "readOnly": true
      },
      {
        "name": "user_agent",
        "label": "User Agent",
        "type": "text",
        "required": false,
        "nullable": true,
        "maxLength": 500,
        "readOnly": true
      },
      {
        "name": "created_at",
        "label": "Created At",
        "type": "datetime",
        "required": false,
        "nullable": false,
        "readOnly": true
      }
    ],
    "columns": [
      "action",
      "entity_type",
      "entity_id",
      "user_id",
      "created_at"
    ],
    "search": [],
    "readOnly": true
  },
  {
    "key": "workspace-settings",
    "table": "workspace_settings",
    "title": "Workspace settings",
    "singular": "Workspace setting",
    "description": "Store general workspace preferences as named values.",
    "group": "Settings",
    "permission": "settings",
    "fields": [
      {
        "name": "setting_key",
        "label": "Setting Key",
        "type": "text",
        "required": true,
        "nullable": false,
        "maxLength": 120
      },
      {
        "name": "setting_value",
        "label": "Setting Value",
        "type": "textarea",
        "required": false,
        "nullable": true
      },
      {
        "name": "created_at",
        "label": "Created At",
        "type": "datetime",
        "required": false,
        "nullable": false,
        "readOnly": true
      },
      {
        "name": "updated_at",
        "label": "Updated At",
        "type": "datetime",
        "required": false,
        "nullable": false,
        "readOnly": true
      }
    ],
    "columns": [
      "setting_key",
      "setting_value"
    ],
    "search": [
      "setting_key",
      "setting_value"
    ]
  }
];
