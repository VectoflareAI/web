import { getCollection, render } from 'astro:content';
import type { CollectionEntry } from 'astro:content';
import slugify from 'limax';
import type { Product } from '~/types';

const cleanSlug = (text = '') =>
  text
    .split('/')
    .map((part) => slugify(part))
    .join('/');

const getNormalizedProduct = async (entry: CollectionEntry<'product'>): Promise<Product> => {
  const { id, data } = entry;
  const { Content } = await render(entry);

  const slug = cleanSlug(id.replace(/\.(md|mdx)$/, ''));
  const categorySlug = cleanSlug(data.category);

  return {
    id,
    slug,
    title: data.title,
    category: { slug: categorySlug, title: data.category },
    description: data.description,
    images: data.images || [],
    specifications: data.specifications || [],
    applications: data.applications,
    features: data.features || [],
    draft: data.draft || false,
    metadata: data.metadata,
    Content,
  };
};

const load = async (): Promise<Product[]> => {
  const entries = await getCollection('product');
  const products = await Promise.all(entries.map(getNormalizedProduct));
  return products.filter((p) => !p.draft);
};

let _products: Product[];

export const fetchProducts = async (): Promise<Product[]> => {
  if (!_products) _products = await load();
  return _products;
};

export const getProductCategories = async (): Promise<{ slug: string; title: string }[]> => {
  const products = await fetchProducts();
  const map: Record<string, string> = {};
  products.forEach((p) => { map[p.category.slug] = p.category.title; });
  return Object.entries(map).map(([slug, title]) => ({ slug, title }));
};

export const getProductsByCategory = async (categorySlug: string): Promise<Product[]> => {
  const products = await fetchProducts();
  return products.filter((p) => p.category.slug === categorySlug);
};
