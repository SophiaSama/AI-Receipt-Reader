# Deployment Checklist & Troubleshooting

## ✅ Pre-Deployment Checklist

### For AWS Deployment

- [ ] AWS CLI installed and configured
- [ ] SAM CLI installed (`npm install -g aws-sam-cli`)
- [ ] Backend dependencies installed (`cd backend && npm install`)
- [ ] Backend compiled (`cd backend && npm run build`)
- [ ] `.env` file configured with Mistral API key
- [ ] AWS credentials configured (`aws configure`)
- [ ] Run deployment: `cd backend && npm run deploy`

### For Vercel Deployment

- [ ] Vercel CLI installed (`npm install -g vercel`)
- [ ] Frontend dependencies installed (`npm install`)
- [ ] Backend dependencies installed (`cd backend && npm install`)
- [ ] Environment variables configured in Vercel dashboard
- [ ] AWS credentials configured in Vercel (if using real AWS services)
- [ ] Run deployment: `vercel`

## 🔍 Common Issues & Solutions

### Issue 1: Frontend loads but API calls fail (404)

**Symptoms:**
- App renders but shows "Failed to fetch" errors
- API endpoints return 404

**Solutions:**
1. Check if backend server is running on port 3001
2. Verify Vite proxy configuration in `vite.config.ts`
3. Check browser console for CORS errors
4. Ensure backend is built: `cd backend && npm run build`

**For Vercel:**
- Verify `vercel.json` rewrites are correct
- Check Vercel deployment logs
- Ensure backend compiled output exists in `backend/dist/`

### Issue 2: App renders but data doesn't persist

**Symptoms:**
- Receipts disappear on page refresh
- Local storage mode warning in console

**Solutions:**
1. Check `USE_LOCAL_STORAGE` environment variable
2. For local dev: Keep it `true`
3. For production: Set it to `false` and configure AWS credentials
4. Verify AWS credentials: `aws sts get-caller-identity`

### Issue 3: Image upload fails

**Symptoms:**
- Upload shows success but no image appears
- S3 errors in backend logs

**Solutions:**
1. Check S3 bucket exists and is accessible
2. Verify CORS configuration on S3 bucket
3. Check AWS permissions for Lambda to write to S3
4. For local dev: Images are stored in memory, check `/images/` endpoint

### Issue 4: Mistral AI errors

**Symptoms:**
- "Failed to extract text" errors
- Mock data appears instead of real OCR results

**Solutions:**
1. Verify `MISTRAL_API_KEY` is set correctly
2. Check API key is valid: test at https://console.mistral.ai/
3. Verify API key has proper permissions
4. Check Mistral API quota/limits

### Issue 5: TypeScript compilation errors

**Symptoms:**
- Build fails with TypeScript errors
- `tsc` command fails

**Solutions:**
1. Ensure all dependencies are installed: `cd backend && npm install`
2. Check `tsconfig.json` settings
3. Verify all imports are correct
4. Clear compiled output: `rm -rf backend/dist && cd backend && npm run build`

### Issue 6: Vercel deployment succeeds but app doesn't work

**Symptoms:**
- Deployment shows success
- App loads but backend APIs fail
- Environment variables missing

**Solutions:**
1. Check Vercel environment variables are set
2. Verify build logs show backend compilation
3. Check function logs in Vercel dashboard
4. Ensure `vercel-build` script runs successfully
5. Test locally first: `vercel dev`

## 🧪 Testing Checklist

### Local Development Test

```powershell
# Terminal 1: Start backend
cd backend
npm run dev

# Terminal 2: Start frontend
npm run dev

# Open browser to http://localhost:3000
# Test each feature:
```

- [ ] Upload a receipt image → Should process and display
- [ ] Manual entry → Should save successfully
- [ ] View receipt list → Should show all receipts
- [ ] Delete receipt → Should remove from list
- [ ] Filter receipts → Should filter correctly
- [ ] Export CSV → Should download file

### Production Test (After Deployment)

- [ ] Open deployed URL
- [ ] All features work as in local
- [ ] Images persist after page refresh
- [ ] Data persists after browser restart
- [ ] No console errors
- [ ] API response times acceptable

## 📊 Monitoring

### AWS CloudWatch Logs

Check Lambda logs for errors:
```bash
aws logs tail /aws/lambda/ProcessReceiptFunction --follow
```

### Vercel Logs

Check function logs:
```bash
vercel logs
```

## 🚀 Performance Optimization

1. **Image Optimization**: Consider resizing images before upload
2. **Caching**: Add CloudFront CDN for S3 images
3. **Lambda Cold Start**: Use provisioned concurrency for critical functions
4. **Database**: Add indexes to DynamoDB for faster queries

## 📝 Notes

- Local development uses in-memory storage by default
- Production should always use AWS services (DynamoDB + S3)
- Mistral API has rate limits - implement retry logic for production
- AWS Lambda has 6MB payload limit - compress large images
