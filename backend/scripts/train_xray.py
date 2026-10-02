from pathlib import Path
import json, csv
import torch
from torch import nn
from torch.utils.data import DataLoader
from torchvision import datasets, models, transforms
from sklearn.metrics import accuracy_score, precision_recall_fscore_support, confusion_matrix

ROOT=Path(__file__).resolve().parents[1]
DATA=ROOT/"datasets/chest_xray"
OUT=ROOT/"models/checkpoints"
EVAL=ROOT/"evaluation/xray"
OUT.mkdir(parents=True,exist_ok=True); EVAL.mkdir(parents=True,exist_ok=True)

DEVICE="cuda" if torch.cuda.is_available() else "cpu"
BATCH_SIZE=64; EPOCHS=3; LR=1e-3; IMAGE_SIZE=128
print(f"Device: {DEVICE}")
print(f"Dataset: {DATA}")
print(f"Image size: {IMAGE_SIZE}x{IMAGE_SIZE}")

norm=([0.485,0.456,0.406],[0.229,0.224,0.225])
train_tfms=transforms.Compose([transforms.Resize((IMAGE_SIZE,IMAGE_SIZE)),transforms.RandomHorizontalFlip(),transforms.ToTensor(),transforms.Normalize(*norm)])
eval_tfms=transforms.Compose([transforms.Resize((IMAGE_SIZE,IMAGE_SIZE)),transforms.ToTensor(),transforms.Normalize(*norm)])

train_ds=datasets.ImageFolder(DATA/"train",transform=train_tfms)
val_ds=datasets.ImageFolder(DATA/"val",transform=eval_tfms)
test_ds=datasets.ImageFolder(DATA/"test",transform=eval_tfms)
if train_ds.classes!=val_ds.classes or train_ds.classes!=test_ds.classes:
    raise RuntimeError(f"Class mismatch: train={train_ds.classes}, val={val_ds.classes}, test={test_ds.classes}")

print(f"Classes: {train_ds.classes}")
print(f"Train images: {len(train_ds)}")
print(f"Validation images: {len(val_ds)}")
print(f"Test images: {len(test_ds)}")

train_loader=DataLoader(train_ds,batch_size=BATCH_SIZE,shuffle=True,num_workers=0)
val_loader=DataLoader(val_ds,batch_size=BATCH_SIZE,shuffle=False,num_workers=0)
test_loader=DataLoader(test_ds,batch_size=BATCH_SIZE,shuffle=False,num_workers=0)

model=models.densenet121(weights=models.DenseNet121_Weights.DEFAULT)
for p in model.features.parameters(): p.requires_grad=False
model.classifier=nn.Linear(model.classifier.in_features,len(train_ds.classes))
model.to(DEVICE)
optimizer=torch.optim.AdamW(model.classifier.parameters(),lr=LR)
criterion=nn.CrossEntropyLoss()
print("Frozen DenseNet feature extractor; classifier-only training.")

def features(x):
    with torch.no_grad():
        x=model.features(x)
        x=torch.relu(x)
        x=torch.nn.functional.adaptive_avg_pool2d(x,(1,1))
        return torch.flatten(x,1)

best=float("inf"); history=[]
for epoch in range(EPOCHS):
    model.train(); model.features.eval(); total_loss=0
    for i,(x,y) in enumerate(train_loader,1):
        x,y=x.to(DEVICE),y.to(DEVICE)
        z=features(x)
        loss=criterion(model.classifier(z),y)
        optimizer.zero_grad(); loss.backward(); optimizer.step()
        total_loss+=loss.item()
        if i%20==0: print(f" epoch {epoch+1}: batch {i}/{len(train_loader)}")
    model.eval(); vl=0; correct=0; total=0
    with torch.no_grad():
        for x,y in val_loader:
            x,y=x.to(DEVICE),y.to(DEVICE)
            loss=criterion(model.classifier(features(x)),y)
            vl+=loss.item(); correct+=(model.classifier(features(x)).argmax(1)==y).sum().item(); total+=y.numel()
    tl=total_loss/max(1,len(train_loader)); va=vl/max(1,len(val_loader)); acc=correct/max(1,total)
    history.append({"epoch":epoch+1,"train_loss":tl,"val_loss":va,"val_accuracy":acc})
    print(f"epoch={epoch+1}/{EPOCHS} train_loss={tl:.4f} val_loss={va:.4f} val_acc={acc:.4f}")
    if va<best:
        best=va
        torch.save({"model_state":model.state_dict(),"classes":train_ds.classes,"image_size":IMAGE_SIZE},OUT/"xray_model.pt")
        (OUT/"classes.json").write_text(json.dumps(train_ds.classes,indent=2),encoding="utf-8")
        print("  Saved best model.")

(EVAL/"training_history.json").write_text(json.dumps(history,indent=2),encoding="utf-8")
ck=torch.load(OUT/"xray_model.pt",map_location=DEVICE,weights_only=False); model.load_state_dict(ck["model_state"]); model.eval()
yt=[]; yp=[]
with torch.no_grad():
    for x,y in test_loader:
        pred=model.classifier(features(x.to(DEVICE))).argmax(1).cpu().tolist()
        yp.extend(pred); yt.extend(y.tolist())
accuracy=accuracy_score(yt,yp)
precision,recall,f1,_=precision_recall_fscore_support(yt,yp,average="binary" if len(train_ds.classes)==2 else "weighted",zero_division=0)
cm=confusion_matrix(yt,yp)
metrics={"classes":train_ds.classes,"device":DEVICE,"image_size":IMAGE_SIZE,"test_images":len(test_ds),"accuracy":float(accuracy),"precision":float(precision),"recall":float(recall),"f1":float(f1),"confusion_matrix":cm.tolist()}
(EVAL/"test_metrics.json").write_text(json.dumps(metrics,indent=2),encoding="utf-8")
with (EVAL/"confusion_matrix.csv").open("w",newline="",encoding="utf-8") as f:
    w=csv.writer(f); w.writerow(["actual/predicted"]+train_ds.classes)
    for i,row in enumerate(cm): w.writerow([train_ds.classes[i]]+row.tolist())
print("\nTraining finished.")
print(f"Accuracy : {accuracy:.4f}")
print(f"Precision: {precision:.4f}")
print(f"Recall   : {recall:.4f}")
print(f"F1       : {f1:.4f}")
print(f"Confusion matrix:\n{cm}")
print("Saved model and evaluation files.")
print("Research prototype only; not a clinical diagnosis.")
