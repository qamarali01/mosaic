import { getProducts } from "@/lib/actions/products"
import { getAllCollections } from "@/lib/actions/collections"
import { ProductsClient } from "@/features/products/products-client"

export default async function ProductsPage() {
  const [{ data: products }, collections] = await Promise.all([
    getProducts({ pageSize: 100, status: "all" }),
    getAllCollections(),
  ])

  return <ProductsClient products={products} collections={collections} />
}
