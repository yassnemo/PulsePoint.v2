import { articles, type Article, type InsertArticle } from "@shared/schema";

export interface IStorage {
  getArticle(id: number): Promise<Article | undefined>;
  getArticleByUrl(url: string): Promise<Article | undefined>;
  createArticle(article: InsertArticle): Promise<Article>;
}

export class MemStorage implements IStorage {
  private articles: Map<number, Article>;
  currentId: number;

  constructor() {
    this.articles = new Map();
    this.currentId = 1;
  }

  async getArticle(id: number): Promise<Article | undefined> {
    return this.articles.get(id);
  }

  async getArticleByUrl(url: string): Promise<Article | undefined> {
    return Array.from(this.articles.values()).find(
      (article) => article.url === url,
    );
  }

  async createArticle(insertArticle: InsertArticle): Promise<Article> {
    const id = this.currentId++;
    const article: Article = { 
      ...insertArticle, 
      id,
      author: insertArticle.author || null,
      imageUrl: insertArticle.imageUrl || null,
      keyPoints: insertArticle.keyPoints || null
    };
    this.articles.set(id, article);
    return article;
  }
}

export const storage = new MemStorage();
