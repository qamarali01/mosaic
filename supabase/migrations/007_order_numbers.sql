-- ============================================================
-- Separate immutable system IDs from editable order numbers
-- ============================================================

create type order_number_type as enum ('customer_po', 'internal', 'other');

alter table orders rename column order_number to system_number;
alter table orders rename constraint orders_order_number_key to orders_system_number_key;

alter table orders add column order_number text;
alter table orders add column order_number_type order_number_type not null default 'other';

-- Existing generated IDs remain usable order numbers until operations corrects them.
update orders set order_number = system_number;

alter table orders alter column order_number set not null;
alter table orders add constraint orders_customer_order_number_key unique (customer_id, order_number);
alter table orders add constraint orders_order_number_not_blank check (char_length(trim(order_number)) > 0);

create index orders_order_number_idx on orders(order_number);
