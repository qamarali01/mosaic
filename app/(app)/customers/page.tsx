import { getCustomers } from "@/lib/actions/customers"
import { CustomersClient } from "@/features/customers/customers-client"

export default async function CustomersPage() {
  const { data: customers } = await getCustomers({ pageSize: 25, status: "all" })
  return <CustomersClient customers={customers} />
}
